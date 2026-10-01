package httpapi

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

// AssetReader resolves verified file metadata for a public ready character.
type AssetReader interface {
	GetAsset(context.Context, string) (creator.Asset, error)
}

// ObjectReader verifies and retrieves the immutable object content.
type ObjectReader interface {
	Get(context.Context, creator.Asset) ([]byte, error)
}

// GetAssetHandler serves immutable bytes without publishing the bucket.
func GetAssetHandler(assets AssetReader, objects ObjectReader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("assetId")
		if !creationUUID.MatchString(id) {
			writeCreationError(w, 404, "not_found", "Изображение не найдено.")
			return
		}
		if assets == nil || objects == nil {
			writeCreationError(w, 503, "asset_storage_unavailable", "Хранилище изображений временно недоступно.")
			return
		}
		asset, err := assets.GetAsset(r.Context(), id)
		if errors.Is(err, creator.ErrAssetNotFound) {
			writeCreationError(w, 404, "not_found", "Изображение не найдено.")
			return
		}
		if err != nil {
			writeCreationError(w, 503, "asset_storage_unavailable", "Изображение временно недоступно.")
			return
		}
		etag := `"` + asset.SHA256 + `"`
		w.Header().Set("ETag", etag)
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if r.Header.Get("If-None-Match") == etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		data, err := objects.Get(r.Context(), asset)
		if err != nil {
			slog.Warn("public asset read failed", "error_type", fmt.Sprintf("%T", err))
			writeCreationError(w, 503, "asset_storage_unavailable", "Изображение временно недоступно.")
			return
		}
		w.Header().Set("Content-Type", asset.MIMEType)
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(data); err != nil {
			slog.Warn("public asset response failed", "error_type", fmt.Sprintf("%T", err))
		}
	}
}
