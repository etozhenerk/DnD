package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func TestAdvisorHintsWorkWithoutDatabaseOrAISession(t *testing.T) {
	guide, err := advisor.Load("../../../shared/advisor/guide.json")
	if err != nil {
		t.Fatal(err)
	}
	handler := newHandlerWithAdvisor(nil, nil, []string{"https://example.test"}, nil, guide)
	req := httptest.NewRequest(http.MethodGet, "/creator/advisor", nil)
	req.Header.Set("Origin", "https://example.test")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	var result advisor.Guide
	decodeResponse(t, w, http.StatusOK, &result)
	if len(result.Steps) != 7 || result.BudgetRub != 200 || result.Capabilities.Chat {
		t.Fatalf("unexpected guide: %+v", result)
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "https://example.test" || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("unexpected public headers: %v", w.Header())
	}
	recordResponse(t, "advisor-guide.json", w)
	for _, path := range []string{"/drafts", "/drafts/00000000-0000-0000-0000-000000000001/advice"} {
		blocked := apiRequest(handler, http.MethodPost, path, "", nil)
		if blocked.Code != http.StatusForbidden {
			t.Fatalf("hint route exposed draft route %s: status=%d", path, blocked.Code)
		}
	}
	req.Header.Set("Origin", "https://untrusted.test")
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden || w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("CORS bypass: status=%d headers=%v", w.Code, w.Header())
	}
}

func TestMissingAdvisorGuideReturnsUnavailable(t *testing.T) {
	w := apiRequest(newHandler(nil, nil, nil), http.MethodGet, "/creator/advisor", "", nil)
	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("missing guide status=%d", w.Code)
	}
}
