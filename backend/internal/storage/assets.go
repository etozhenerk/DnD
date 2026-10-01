package storage

import (
	"context"
	"errors"
	"fmt"

	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/jackc/pgx/v5"
)

func insertAssets(ctx context.Context, tx pgx.Tx, ch creator.Character) error {
	for _, asset := range ch.Assets {
		_, err := tx.Exec(ctx, `INSERT INTO character_assets
			(id,character_id,kind,object_key,mime_type,size_bytes,sha256,status,verified_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,'verified',now())`,
			asset.ID, ch.ID, asset.Kind, asset.ObjectKey, asset.MIMEType, asset.SizeBytes, asset.SHA256)
		if err != nil {
			return fmt.Errorf("insert character asset: %w", err)
		}
	}
	return nil
}

// GetAsset exposes only files referenced by their owning ready character.
func (s *Store) GetAsset(ctx context.Context, id string) (creator.Asset, error) {
	var a creator.Asset
	err := s.Pool.QueryRow(ctx, `SELECT a.id::text,a.kind,a.object_key,a.mime_type,a.size_bytes,a.sha256
		FROM character_assets a JOIN characters c ON c.id=a.character_id
		WHERE a.id=$1 AND a.status='verified' AND
		((a.kind='portrait' AND c.portrait_asset_id=a.id) OR
		(a.kind='ability_icon' AND EXISTS (SELECT 1 FROM character_abilities b WHERE b.character_id=c.id AND b.icon_asset_id=a.id)))`, id).
		Scan(&a.ID, &a.Kind, &a.ObjectKey, &a.MIMEType, &a.SizeBytes, &a.SHA256)
	if errors.Is(err, pgx.ErrNoRows) {
		return a, creator.ErrAssetNotFound
	}
	if err != nil {
		return a, fmt.Errorf("query public asset: %w", err)
	}
	return a, nil
}

func nullableID(id string) any {
	if id == "" {
		return nil
	}
	return id
}
