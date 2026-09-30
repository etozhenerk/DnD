package storage

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/etozhenerk/DnD/backend/internal/abilities"
	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/jackc/pgx/v5"
)

func insertAbility(ctx context.Context, tx pgx.Tx, characterID string, position int, a creator.Ability) error {
	effects, err := json.Marshal(a.Effects)
	if err != nil {
		return fmt.Errorf("encode ability effects: %w", err)
	}
	var scope, limit any
	if a.Uses != nil {
		scope, limit = a.Uses.Scope, a.Uses.Max
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO character_abilities (
			character_id, ability_id, position, name, description, effect_text,
			trigger, automation_mode, effects, uses_scope, uses_max
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,
		characterID, a.ID, position, a.Name, a.Description, a.EffectText,
		a.Trigger, a.AutomationMode, string(effects), scope, limit)
	if err != nil {
		return fmt.Errorf("insert ability: %w", err)
	}
	return nil
}

func (s *Store) loadAbilities(ctx context.Context, characterID string) ([]creator.Ability, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT ability_id, name, description, effect_text, trigger, automation_mode,
			effects::text, uses_scope, uses_max
		FROM character_abilities WHERE character_id=$1 ORDER BY position`, characterID)
	if err != nil {
		return nil, fmt.Errorf("query abilities: %w", err)
	}
	defer rows.Close()
	out := []creator.Ability{}
	for rows.Next() {
		var a creator.Ability
		var raw string
		var scope *string
		var limit *int
		if err := rows.Scan(&a.ID, &a.Name, &a.Description, &a.EffectText, &a.Trigger, &a.AutomationMode, &raw, &scope, &limit); err != nil {
			return nil, fmt.Errorf("scan ability: %w", err)
		}
		if err := json.Unmarshal([]byte(raw), &a.Effects); err != nil {
			return nil, fmt.Errorf("decode ability effects: %w", err)
		}
		if scope != nil && limit != nil {
			a.Uses = &creator.Uses{Scope: *scope, Max: *limit}
		}
		if len(a.Effects) == 1 && a.AutomationMode == "automatic" {
			a.ProfileID, a.ModifierStat = a.Effects[0].ProfileID, a.Effects[0].ModifierStat
		}
		if a.Effects == nil {
			a.Effects = []abilities.Effect{}
		}
		out = append(out, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read abilities: %w", err)
	}
	return out, nil
}
