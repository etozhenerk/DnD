package storage

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct{ Pool *pgxpool.Pool }
type Draft struct {
	ID        string                     `json:"id"`
	RulesetID string                     `json:"rulesetId"`
	FormData  map[string]json.RawMessage `json:"formData"`
	CreatedAt time.Time                  `json:"createdAt"`
	UpdatedAt time.Time                  `json:"updatedAt"`
}

var ErrNotFound = errors.New("not found")

func New(ctx context.Context, url string) (*Store, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 2
	cfg.MaxConnIdleTime = time.Minute
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err = pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{Pool: pool}, nil
}
func tokenHash(token string) [32]byte { return sha256.Sum256([]byte(token)) }
func newToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
func scanDraft(row pgx.Row) (Draft, error) {
	var d Draft
	var form string
	err := row.Scan(&d.ID, &d.RulesetID, &form, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return d, ErrNotFound
	}
	if err != nil {
		return d, err
	}
	err = json.Unmarshal([]byte(form), &d.FormData)
	return d, err
}
func (s *Store) CreateDraft(ctx context.Context, ruleset string) (Draft, string, error) {
	token, err := newToken()
	if err != nil {
		return Draft{}, "", err
	}
	hash := tokenHash(token)
	d, err := scanDraft(s.Pool.QueryRow(ctx, `INSERT INTO character_drafts (draft_token_hash,ruleset_id) VALUES ($1,$2) RETURNING id::text,ruleset_id,form_data::text,created_at,updated_at`, hash[:], ruleset))
	return d, token, err
}
func (s *Store) GetDraft(ctx context.Context, id, token string) (Draft, error) {
	hash := tokenHash(token)
	return scanDraft(s.Pool.QueryRow(ctx, `SELECT id::text,ruleset_id,form_data::text,created_at,updated_at FROM character_drafts WHERE id=$1 AND draft_token_hash=$2`, id, hash[:]))
}
func (s *Store) PatchDraft(ctx context.Context, id, token, section string, value json.RawMessage) (Draft, error) {
	hash := tokenHash(token)
	return scanDraft(s.Pool.QueryRow(ctx, `UPDATE character_drafts SET form_data=jsonb_set(form_data,ARRAY[$3]::text[],$4::jsonb,true),updated_at=now() WHERE id=$1 AND draft_token_hash=$2 RETURNING id::text,ruleset_id,form_data::text,created_at,updated_at`, id, hash[:], section, string(value)))
}
func (s *Store) Complete(ctx context.Context, id, token string, catalog *creator.Catalog) (creator.Character, creator.Validation, error) {
	tx, err := s.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return creator.Character{}, creator.Validation{}, err
	}
	defer tx.Rollback(ctx)
	hash := tokenHash(token)
	var form string
	var ruleset string
	var creatorID *string
	err = tx.QueryRow(ctx, `SELECT form_data::text,ruleset_id,creator_user_id::text FROM character_drafts WHERE id=$1 AND draft_token_hash=$2 FOR UPDATE`, id, hash[:]).Scan(&form, &ruleset, &creatorID)
	if errors.Is(err, pgx.ErrNoRows) {
		return creator.Character{}, creator.Validation{}, ErrNotFound
	}
	if err != nil {
		return creator.Character{}, creator.Validation{}, err
	}
	var data map[string]json.RawMessage
	if err = json.Unmarshal([]byte(form), &data); err != nil {
		return creator.Character{}, creator.Validation{}, err
	}
	validation, ch := catalog.ValidateForRuleset(ruleset, data)
	if !validation.Valid {
		return creator.Character{}, validation, nil
	}
	a := ch.Attributes
	var createdAt time.Time
	err = tx.QueryRow(ctx, `INSERT INTO characters (creator_user_id,display_name,pronouns,role_label,race_id,class_id,story,motivation,appearance,personality,strength,dexterity,constitution,wisdom,intelligence,charisma,max_hp,base_ac,ruleset_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id::text,created_at`, creatorID, ch.DisplayName, ch.Pronouns, ch.RoleLabel, ch.RaceID, ch.ClassID, ch.Story, ch.Motivation, ch.Appearance, ch.Personality, a["strength"], a["dexterity"], a["constitution"], a["wisdom"], a["intelligence"], a["charisma"], ch.MaxHP, ch.BaseAC, ch.RulesetID).Scan(&ch.ID, &createdAt)
	if err != nil {
		return creator.Character{}, validation, err
	}
	ch.CreatedAt = createdAt.Format(time.RFC3339Nano)
	for i, x := range ch.Abilities {
		if err := insertAbility(ctx, tx, ch.ID, i+1, x); err != nil {
			return creator.Character{}, validation, err
		}
	}
	for i, x := range ch.Equipment {
		var scope any
		var max any
		if x.Charges != nil {
			scope = x.Charges.Scope
			max = x.Charges.Max
		}
		_, err = tx.Exec(ctx, `INSERT INTO character_items (character_id,item_id,position,name,description,effect_text,effects,charges_scope,charges_max) VALUES ($1,$2,$3,$4,$5,$6,'[]'::jsonb,$7,$8)`, ch.ID, x.ID, i+1, x.Name, x.Description, x.EffectText, scope, max)
		if err != nil {
			return creator.Character{}, validation, fmt.Errorf("insert item: %w", err)
		}
	}
	if _, err = tx.Exec(ctx, `DELETE FROM character_drafts WHERE id=$1`, id); err != nil {
		return creator.Character{}, validation, err
	}
	if err = tx.Commit(ctx); err != nil {
		return creator.Character{}, validation, err
	}
	return ch, validation, nil
}
func (s *Store) ListCharacters(ctx context.Context, limit, offset int) ([]creator.Summary, error) {
	rows, err := s.Pool.Query(ctx, `
        SELECT c.id::text,c.display_name,c.race_id,c.class_id,c.max_hp,c.base_ac,
            c.created_at,COALESCE(a.id::text,'')
        FROM characters c LEFT JOIN character_assets a
            ON a.id=c.portrait_asset_id AND a.character_id=c.id AND a.status='verified'
        ORDER BY c.created_at DESC,c.id DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []creator.Summary{}
	for rows.Next() {
		var c creator.Summary
		var portraitID string
		var t time.Time
		if err = rows.Scan(&c.ID, &c.DisplayName, &c.RaceID, &c.ClassID, &c.MaxHP, &c.BaseAC, &t, &portraitID); err != nil {
			return nil, err
		}
		c.CreatedAt = t.Format(time.RFC3339Nano)
		c.PortraitURL = creator.AssetURL(portraitID)
		out = append(out, c)
	}
	return out, rows.Err()
}
func (s *Store) GetCharacter(ctx context.Context, id string) (creator.Character, error) {
	var c creator.Character
	var t time.Time
	var vals [6]int
	var pronouns, roleLabel, story, motivation, appearance *string
	err := s.Pool.QueryRow(ctx, `
        SELECT c.id::text,c.display_name,c.pronouns,c.role_label,c.race_id,c.class_id,
            c.story,c.motivation,c.appearance,c.personality,c.strength,c.dexterity,
            c.constitution,c.wisdom,c.intelligence,c.charisma,c.max_hp,c.base_ac,
            c.ruleset_id,c.created_at,COALESCE(a.id::text,'')
        FROM characters c LEFT JOIN character_assets a
            ON a.id=c.portrait_asset_id AND a.character_id=c.id AND a.status='verified'
        WHERE c.id=$1`, id).Scan(&c.ID, &c.DisplayName, &pronouns, &roleLabel, &c.RaceID, &c.ClassID, &story, &motivation, &appearance, &c.Personality, &vals[0], &vals[1], &vals[2], &vals[3], &vals[4], &vals[5], &c.MaxHP, &c.BaseAC, &c.RulesetID, &t, &c.PortraitAssetID)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, ErrNotFound
	}
	if err != nil {
		return c, err
	}
	if pronouns != nil {
		c.Pronouns = *pronouns
	}
	if roleLabel != nil {
		c.RoleLabel = *roleLabel
	}
	if story != nil {
		c.Story = *story
	}
	if motivation != nil {
		c.Motivation = *motivation
	}
	if appearance != nil {
		c.Appearance = *appearance
	}
	c.CreatedAt = t.Format(time.RFC3339Nano)
	c.PortraitURL = creator.AssetURL(c.PortraitAssetID)
	c.Attributes = map[string]int{"strength": vals[0], "dexterity": vals[1], "constitution": vals[2], "wisdom": vals[3], "intelligence": vals[4], "charisma": vals[5]}
	c.Abilities = []creator.Ability{}
	c.Equipment = []creator.Item{}
	if c.Personality == nil {
		c.Personality = []string{}
	}
	c.Abilities, err = s.loadAbilities(ctx, id)
	if err != nil {
		return c, err
	}
	ir, err := s.Pool.Query(ctx, `SELECT item_id,name,description,effect_text,charges_scope,charges_max FROM character_items WHERE character_id=$1 ORDER BY position`, id)
	if err != nil {
		return c, err
	}
	for ir.Next() {
		var x creator.Item
		var scope *string
		var max *int
		if err = ir.Scan(&x.ID, &x.Name, &x.Description, &x.EffectText, &scope, &max); err != nil {
			ir.Close()
			return c, err
		}
		if scope != nil && max != nil {
			x.Charges = &creator.Uses{Scope: *scope, Max: *max}
		}
		c.Equipment = append(c.Equipment, x)
	}
	err = ir.Err()
	ir.Close()
	return c, err
}
