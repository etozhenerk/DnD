package main

import (
	"encoding/json"
	"net/http"
)

func (s *server) checkAbilityPatch(w http.ResponseWriter, r *http.Request, id, token string, raw json.RawMessage) bool {
	draft, err := s.store.GetDraft(r.Context(), id, token)
	if err != nil {
		storeFailure(w, err)
		return false
	}
	if err := s.catalog.CheckAbilitySection(draft.RulesetID, raw); err != nil {
		fail(w, http.StatusBadRequest, "invalid_abilities", "Неверная структура навыков или неподдержанное поле")
		return false
	}
	return true
}
