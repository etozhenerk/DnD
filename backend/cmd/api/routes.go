package main

import (
	"net/http"

	"github.com/etozhenerk/DnD/backend/internal/characterapp"
	"github.com/etozhenerk/DnD/backend/internal/httpapi"
)

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /creator/options", s.options)
	mux.HandleFunc("GET /creator/advisor", httpapi.AdvisorGuideHandler(s.advisor))
	chat := httpapi.AdvisorHandlers{Service: s.chat}
	mux.HandleFunc("POST /advisor/sessions", chat.Create)
	mux.HandleFunc("GET /advisor/sessions/{sessionId}", chat.Read)
	mux.HandleFunc("POST /advisor/sessions/{sessionId}/messages", chat.Send)
	mux.HandleFunc("GET /advisor/sessions/{sessionId}/images/{requestId}", chat.Image)
	mux.HandleFunc("POST /drafts", s.createDraft)
	mux.HandleFunc("GET /drafts/{draftId}", s.getDraft)
	mux.HandleFunc("PATCH /drafts/{draftId}", s.patchDraft)
	mux.HandleFunc("POST /drafts/{draftId}/advice", s.advice)
	mux.HandleFunc("POST /drafts/{draftId}/assets", s.assets)
	mux.HandleFunc("POST /drafts/{draftId}/validate", s.validateDraft)
	mux.HandleFunc("POST /drafts/{draftId}/complete", s.completeDraft)
	mux.HandleFunc("GET /characters", s.listCharacters)
	var objects characterapp.ObjectWriter
	var reader httpapi.ObjectReader
	if s.objects != nil {
		objects = s.objects
		reader = s.objects
	}
	if s.store == nil {
		mux.HandleFunc("POST /characters", httpapi.CreateCharacterHandler(s.catalog, nil))
	} else {
		mux.HandleFunc("POST /characters", httpapi.CreateCharacterWithMediaHandler(s.catalog, s.store, objects))
	}
	if s.store != nil {
		mux.HandleFunc("GET /assets/{assetId}", httpapi.GetAssetHandler(s.store, reader))
	} else {
		mux.HandleFunc("GET /assets/{assetId}", httpapi.GetAssetHandler(nil, reader))
	}
	mux.HandleFunc("GET /characters/{characterId}", s.getCharacter)
	return mux
}
