package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

func recordResponse(t *testing.T, name string, w *httptest.ResponseRecorder) {
	t.Helper()
	dir := os.Getenv("CONTRACT_FIXTURE_DIR")
	if dir == "" {
		return
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, name), w.Body.Bytes(), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestOptionsExposeV2Skills(t *testing.T) {
	c, err := creator.Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	w := apiRequest(newHandler(c, nil, nil), http.MethodGet, "/creator/options", "", nil)
	var response struct {
		RulesetID    string `json:"rulesetId"`
		AbilityRules struct {
			ID       string `json:"id"`
			Profiles []struct {
				ID string `json:"id"`
			} `json:"profiles"`
			Budget struct {
				Points int `json:"points"`
			} `json:"budget"`
		} `json:"abilityRules"`
	}
	decodeResponse(t, w, http.StatusOK, &response)
	if response.RulesetID != "character-creation-v2" || response.AbilityRules.ID != "character-abilities-v1" || len(response.AbilityRules.Profiles) != 7 || response.AbilityRules.Budget.Points != 6 {
		t.Fatalf("options=%+v", response)
	}
	recordResponse(t, "options.json", w)
}
