package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

func TestCachedCatalogStillChecksCORS(t *testing.T) {
	h := newHandler(&creator.Catalog{}, nil, []string{"https://one.test", "https://two.test"})
	for _, origin := range []string{"https://one.test", "https://two.test"} {
		r := httptest.NewRequest(http.MethodGet, "/creator/options", nil)
		r.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 200 || w.Header().Get("Access-Control-Allow-Origin") != origin {
			t.Fatalf("cached catalog has wrong origin: status=%d headers=%v", w.Code, w.Header())
		}
		if origin == "https://two.test" && !strings.Contains(w.Header().Get("Server-Timing"), `desc="hit"`) {
			t.Fatalf("second origin did not hit cache: %v", w.Header())
		}
	}
	r := httptest.NewRequest(http.MethodGet, "/creator/options", nil)
	r.Header.Set("Origin", "https://untrusted.test")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != http.StatusForbidden || w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("cache bypassed CORS: status=%d headers=%v", w.Code, w.Header())
	}
}
