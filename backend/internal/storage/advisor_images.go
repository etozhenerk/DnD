package storage

import (
	"context"
	"encoding/json"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
	"github.com/jackc/pgx/v5"
)

// GetAdvisorImage authorizes both session and request before exposing private metadata.
func (s *Store) GetAdvisorImage(ctx context.Context, id string, hash []byte, requestID string) (advisor.ImageAsset, error) {
	var raw []byte
	err := s.Pool.QueryRow(ctx, `
        SELECT t.result_asset FROM advisor_turns t JOIN advisor_sessions s ON s.id=t.session_id
        WHERE s.id=$1 AND s.token_hash=$2 AND s.expires_at>now()
            AND t.request_id=$3 AND t.status='succeeded' AND t.mode IN ('portrait','icon') AND t.result_asset IS NOT NULL
    `, id, hash, requestID).Scan(&raw)
	if err == pgx.ErrNoRows {
		return advisor.ImageAsset{}, advisor.ErrNotFound
	}
	if err != nil {
		return advisor.ImageAsset{}, err
	}
	var asset advisor.ImageAsset
	if err := json.Unmarshal(raw, &asset); err != nil {
		return advisor.ImageAsset{}, err
	}
	return asset, nil
}
