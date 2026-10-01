package characterapp

import (
	"context"
	"errors"
	"fmt"

	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/etozhenerk/DnD/backend/internal/media"
)

// ErrMediaUnavailable means creation is configured without object storage.
var ErrMediaUnavailable = errors.New("media unavailable")

// ObjectWriter persists only normalized immutable file keys.
type ObjectWriter interface {
	Put(context.Context, creator.Asset, []byte) error
}

// NewCreatorWithMedia adds file persistence without coupling SQL to cloud APIs.
func NewCreatorWithMedia(catalog *creator.Catalog, writer CharacterWriter, objects ObjectWriter) *Creator {
	return &Creator{catalog: catalog, writer: writer, objects: objects}
}

func prepareMedia(ch *creator.Character, files []media.File) []creator.Issue {
	issues := []creator.Issue{}
	seen := map[string]bool{}
	for _, file := range files {
		path := "appearance"
		index := -1
		if file.AbilityID != "" {
			path = "abilities"
			for i, a := range ch.Abilities {
				if a.ID == file.AbilityID && a.ProfileID != "basic-attack" && a.AutomationMode == "automatic" {
					index = i
					break
				}
			}
		}
		asset, err := media.Prepare(ch.ID, file)
		if err != nil || seen[file.AbilityID] || (file.AbilityID != "" && index == -1) {
			issues = append(issues, creator.Issue{Path: path, Code: "invalid", Message: "Проверьте портрет или иконки: нужны PNG/JPEG подходящего размера и существующий активный навык."})
			continue
		}
		seen[file.AbilityID] = true
		ch.Assets = append(ch.Assets, asset)
		if index >= 0 {
			ch.Abilities[index].IconAssetID, ch.Abilities[index].IconURL = asset.ID, creator.AssetURL(asset.ID)
		} else {
			ch.PortraitAssetID, ch.PortraitURL = asset.ID, creator.AssetURL(asset.ID)
		}
	}
	return issues
}

func (s *Creator) uploadMedia(ctx context.Context, ch creator.Character, files []media.File) error {
	if len(files) == 0 {
		return nil
	}
	if s.objects == nil {
		return ErrMediaUnavailable
	}
	for i, file := range files {
		if err := s.objects.Put(ctx, ch.Assets[i], file.Data); err != nil {
			return fmt.Errorf("persist character image: %w", err)
		}
	}
	return nil
}
