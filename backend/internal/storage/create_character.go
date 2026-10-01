package storage

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/jackc/pgx/v5"
)

// CreateCharacter commits an anonymous character and its children atomically.
// The primary key serializes duplicate requests across instances, including lost responses.
func (s *Store) CreateCharacter(ctx context.Context, ch creator.Character) (creator.Character, bool, error) {
	payload, err := json.Marshal(ch)
	if err != nil {
		return creator.Character{}, false, fmt.Errorf("encode creation snapshot: %w", err)
	}
	hash := sha256.Sum256(payload)
	tx, err := s.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return creator.Character{}, false, fmt.Errorf("begin character creation: %w", err)
	}
	defer rollbackCreation(tx)
	createdAt, created, err := insertReadyCharacter(ctx, tx, ch, hash[:])
	if err != nil {
		return creator.Character{}, false, err
	}
	if created {
		if err := insertCharacterChildren(ctx, tx, ch); err != nil {
			return creator.Character{}, false, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return creator.Character{}, false, fmt.Errorf("commit character creation: %w", err)
	}
	ch.CreatedAt = createdAt.Format(time.RFC3339Nano)
	return ch, created, nil
}

func insertReadyCharacter(ctx context.Context, tx pgx.Tx, ch creator.Character, hash []byte) (time.Time, bool, error) {
	a := ch.Attributes
	var createdAt time.Time
	err := tx.QueryRow(ctx, `
		INSERT INTO characters (
			id, creator_user_id, display_name, pronouns, role_label, race_id, class_id,
			story, motivation, appearance, personality, strength, dexterity, constitution,
			wisdom, intelligence, charisma, max_hp, base_ac, ruleset_id, creation_request_hash
		) VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
		ON CONFLICT (id) DO NOTHING RETURNING created_at`,
		ch.ID, ch.DisplayName, ch.Pronouns, ch.RoleLabel, ch.RaceID, ch.ClassID,
		ch.Story, ch.Motivation, ch.Appearance, ch.Personality,
		a["strength"], a["dexterity"], a["constitution"], a["wisdom"], a["intelligence"], a["charisma"],
		ch.MaxHP, ch.BaseAC, ch.RulesetID, hash).Scan(&createdAt)
	if err == nil {
		return createdAt, true, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return time.Time{}, false, fmt.Errorf("insert character: %w", err)
	}
	// A conflicting INSERT waits for the winner to commit. The next statement
	// sees its complete snapshot under PostgreSQL's default READ COMMITTED.
	var existingHash []byte
	err = tx.QueryRow(ctx, `
		SELECT creation_request_hash, created_at FROM characters
		WHERE id=$1 AND creator_user_id IS NULL`, ch.ID).Scan(&existingHash, &createdAt)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && !bytes.Equal(existingHash, hash) {
		return time.Time{}, false, creator.ErrCreationConflict
	}
	if err != nil {
		return time.Time{}, false, fmt.Errorf("read creation receipt: %w", err)
	}
	return createdAt, false, nil
}

func insertCharacterChildren(ctx context.Context, tx pgx.Tx, ch creator.Character) error {
	for i, ability := range ch.Abilities {
		if err := insertAbility(ctx, tx, ch.ID, i+1, ability); err != nil {
			return err
		}
	}
	for i, item := range ch.Equipment {
		_, err := tx.Exec(ctx, `
			INSERT INTO character_items (
				character_id, item_id, position, name, description, effect_text, effects
			) VALUES ($1,$2,$3,$4,$5,$6,'[]'::jsonb)`,
			ch.ID, item.ID, i+1, item.Name, item.Description, item.EffectText)
		if err != nil {
			return fmt.Errorf("insert character equipment: %w", err)
		}
	}
	return nil
}

func rollbackCreation(tx pgx.Tx) {
	// Request cancellation does not roll back a pgx transaction automatically.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
		slog.Warn("character creation rollback failed", "error_type", fmt.Sprintf("%T", err))
	}
}
