package main

import (
	"net/http"
	"strings"
	"testing"
)

func TestDraftActionsRequireUserAuthentication(t *testing.T) {
	const draftPath = "/drafts/00000000-0000-0000-0000-000000000001"
	cases := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/drafts"},
		{http.MethodGet, draftPath},
		{http.MethodPatch, draftPath},
		{http.MethodPost, draftPath + "/validate"},
		{http.MethodPost, draftPath + "/complete"},
		{http.MethodPost, draftPath + "/advice"},
		{http.MethodPost, draftPath + "/assets"},
	}
	for _, tc := range cases {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
			// No store: reaching a draft handler would fail, never return this denial.
			h := newHandler(nil, nil, nil)
			for _, token := range []string{"", strings.Repeat("x", 43)} {
				w := apiRequest(h, tc.method, tc.path, token, nil)
				var response apiError
				decodeResponse(t, w, http.StatusForbidden, &response)
				if response.Code != "drafts_require_authentication" {
					t.Fatalf("code=%q, want drafts_require_authentication", response.Code)
				}
				recordResponse(t, "draft-access-denied.json", w)
			}
		})
	}
}

func TestAnonymousDraftPolicyDoesNotChangeDatabase(t *testing.T) {
	store, catalog := testDatabase(t)
	draft, token, err := store.CreateDraft(t.Context(), catalog.RulesetID)
	if err != nil {
		t.Fatal(err)
	}
	h := newHandler(catalog, store, nil)
	decodeResponse(t, apiRequest(h, http.MethodPost, "/drafts", "", nil), http.StatusForbidden, nil)
	decodeResponse(t, apiRequest(h, http.MethodGet, "/drafts/"+draft.ID, token, nil), http.StatusForbidden, nil)
	var count int
	if err := store.Pool.QueryRow(t.Context(), "SELECT count(*) FROM character_drafts").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("draft count=%d, want unchanged count 1", count)
	}
}
