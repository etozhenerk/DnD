package main

import (
	"context"
	"fmt"
	"path/filepath"
	"regexp"
	"time"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
	"github.com/etozhenerk/DnD/backend/internal/aistudio"
	"github.com/etozhenerk/DnD/backend/internal/blobstore"
	"github.com/etozhenerk/DnD/backend/internal/characterapp"
	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/etozhenerk/DnD/backend/internal/storage"
)

// Paid calls default to off. Enabling requires a migrated ledger, runtime IAM
// and a reviewed token envelope/pricing; configuration cannot raise the budgets.
func advisorRuntime(getenv func(string) string, catalog *creator.Catalog, store *storage.Store) (*characterapp.Advisor, error) {
	if getenv("ADVISOR_CHAT_ENABLED") != "true" {
		return nil, nil
	}
	folder := getenv("ADVISOR_FOLDER_ID")
	if !regexp.MustCompile(`^[a-z0-9]{20}$`).MatchString(folder) || store == nil {
		return nil, fmt.Errorf("advisor runtime configuration incomplete")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := store.AdvisorReady(ctx); err != nil {
		return nil, err
	}
	path := getenv("ADVISOR_PERSONA_PATH")
	if path == "" {
		path = "../shared/advisor/persona.md"
	}
	contentDir := getenv("CONTENT_DIR")
	if contentDir == "" {
		contentDir = "../content"
	}
	prompt, err := advisor.LoadPrompt(path, filepath.Join(contentDir, "world-map.json"), catalog)
	if err != nil {
		return nil, err
	}
	model := aistudio.New(folder)
	service := characterapp.NewAdvisor(store, model, prompt)
	if getenv("ADVISOR_IMAGES_ENABLED") == "true" {
		bucket := getenv("ASSET_BUCKET")
		if bucket == "" {
			return nil, fmt.Errorf("advisor image storage unavailable")
		}
		service.EnableImages(model, blobstore.New(bucket))
	}
	return service, nil
}
