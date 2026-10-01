package main

import "net/http"

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /creator/options", s.options)
	mux.HandleFunc("POST /drafts", s.createDraft)
	mux.HandleFunc("GET /drafts/{draftId}", s.getDraft)
	mux.HandleFunc("PATCH /drafts/{draftId}", s.patchDraft)
	mux.HandleFunc("POST /drafts/{draftId}/advice", s.advice)
	mux.HandleFunc("POST /drafts/{draftId}/assets", s.assets)
	mux.HandleFunc("POST /drafts/{draftId}/validate", s.validateDraft)
	mux.HandleFunc("POST /drafts/{draftId}/complete", s.completeDraft)
	mux.HandleFunc("GET /characters", s.listCharacters)
	mux.HandleFunc("GET /characters/{characterId}", s.getCharacter)
	return mux
}
