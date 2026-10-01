package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/etozhenerk/DnD/backend/internal/storage"
)

type draftCredentials struct {
	ID        string `json:"id"`
	RulesetID string `json:"rulesetId"`
	Token     string `json:"token"`
}

// Exercise the retained draft mechanics only against CI's temporary database.
// The production handler always applies restrictDrafts, tested separately.
func newDraftMechanicsTestHandler(c *creator.Catalog, st *storage.Store) http.Handler {
	s := &server{catalog: c, store: st}
	return s.routes()
}

func apiRequest(handler http.Handler, method, path, token string, body []byte) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	return w
}

func decodeResponse(t *testing.T, w *httptest.ResponseRecorder, status int, value any) {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status=%d want=%d body=%s", w.Code, status, w.Body.String())
	}
	if value != nil {
		if err := json.Unmarshal(w.Body.Bytes(), value); err != nil {
			t.Fatal(err)
		}
	}
}

func fixtureForm(t *testing.T, c *creator.Catalog) map[string]json.RawMessage {
	t.Helper()
	var stats map[string]int
	for _, cl := range c.Rules.ClassProfiles {
		if cl.ID == "wizard" {
			stats = cl.DefaultStats
		}
	}
	attributes, err := json.Marshal(stats)
	if err != nil {
		t.Fatal(err)
	}
	return map[string]json.RawMessage{
		"appearance": json.RawMessage(`{"displayName":"Тестовый волшебник"}`),
		"race":       json.RawMessage(`{"raceId":"humans"}`),
		"class":      json.RawMessage(`{"classId":"wizard"}`),
		"attributes": attributes,
		"abilities": json.RawMessage(`{
			"basicAction":{"name":"Посох","description":"","modifierStat":"intelligence"},
			"items":[
				{"id":"frost","name":"Искра","description":"Без заморозки","profileId":"damage-d8-twice","modifierStat":"wisdom"},
				{"id":"flame","name":"Пламя","description":"","profileId":"damage-2d6-once","modifierStat":"intelligence"},
				{"id":"care","name":"Забота","description":"","profileId":"healing-d6-twice","modifierStat":"strength","iconAssetId":null}
			],
			"narrativeItems":[{"id":"traveler","name":"Путешественник","description":"Знает дороги"}]
		}`),
		"equipment": json.RawMessage(`{"items":[]}`),
	}
}

func saveForm(t *testing.T, handler http.Handler, d draftCredentials, form map[string]json.RawMessage) {
	t.Helper()
	for _, section := range []string{"appearance", "race", "class", "attributes", "abilities", "equipment"} {
		body, err := json.Marshal(struct {
			Section string          `json:"section"`
			Value   json.RawMessage `json:"value"`
		}{Section: section, Value: form[section]})
		if err != nil {
			t.Fatal(err)
		}
		decodeResponse(t, apiRequest(handler, http.MethodPatch, "/drafts/"+d.ID, d.Token, body), http.StatusOK, nil)
	}
}

func filledDraft(t *testing.T, handler http.Handler, c *creator.Catalog) draftCredentials {
	t.Helper()
	var d draftCredentials
	decodeResponse(t, apiRequest(handler, http.MethodPost, "/drafts", "", nil), http.StatusCreated, &d)
	if d.RulesetID != "character-creation-v3" || len(d.Token) != 43 {
		t.Fatalf("unexpected created draft ruleset or token length")
	}
	saveForm(t, handler, d, fixtureForm(t, c))
	return d
}

func characterCount(t *testing.T, store *storage.Store) int {
	t.Helper()
	var count int
	if err := store.Pool.QueryRow(t.Context(), "SELECT count(*) FROM characters").Scan(&count); err != nil {
		t.Fatal(err)
	}
	return count
}
