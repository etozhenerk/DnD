package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	newHandler(nil, nil, nil).ServeHTTP(w, req)
	if w.Code != 200 || w.Body.String() != "{\"status\":\"ok\"}\n" {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
}
func TestHealthRejectsOtherMethods(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/health", nil)
	w := httptest.NewRecorder()
	newHandler(nil, nil, nil).ServeHTTP(w, req)
	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status=%d", w.Code)
	}
}
func TestCORSPreflight(t *testing.T) {
	handler := newHandler(nil, nil, []string{"https://example.test"})
	req := httptest.NewRequest(http.MethodOptions, "/drafts/123", nil)
	req.Header.Set("Origin", "https://example.test")
	req.Header.Set("Access-Control-Request-Method", "PATCH")
	req.Header.Set("Access-Control-Request-Headers", "authorization,content-type")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusNoContent || w.Header().Get("Access-Control-Allow-Origin") != "https://example.test" || w.Header().Get("Access-Control-Allow-Headers") != "Authorization, Content-Type" {
		t.Fatalf("status=%d headers=%v", w.Code, w.Header())
	}
	req.Header.Set("Origin", "https://untrusted.test")
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden || w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("untrusted status=%d headers=%v", w.Code, w.Header())
	}
}
func TestMissingDraftToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/drafts/00000000-0000-0000-0000-000000000001", nil)
	req.SetPathValue("draftId", "00000000-0000-0000-0000-000000000001")
	w := httptest.NewRecorder()
	_, _, ok := draftAuth(w, req)
	if ok || w.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d", w.Code)
	}
}

func TestOptionsExposeApprovedCatalog(t *testing.T) {
	catalog, err := creator.Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/creator/options", nil)
	w := httptest.NewRecorder()
	newHandler(catalog, nil, nil).ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	var body struct {
		Rules struct {
			ID            string            `json:"id"`
			ClassProfiles []json.RawMessage `json:"classProfiles"`
		} `json:"rules"`
		Races []json.RawMessage `json:"races"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Rules.ID != "character-creation-v1" || len(body.Rules.ClassProfiles) != 12 || len(body.Races) != 7 {
		t.Fatalf("catalog=%+v", body)
	}
}
