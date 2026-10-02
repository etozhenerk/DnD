package httpapi

import (
	"net/http"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

// AdvisorGuideHandler returns public hints without accessing the DB or AI Studio.
func AdvisorGuideHandler(guide *advisor.Guide) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		if guide == nil {
			writeCreationError(w, http.StatusServiceUnavailable, "advisor_guide_unavailable", "Подсказки советника временно недоступны.")
			return
		}
		writeCreationJSON(w, http.StatusOK, guide)
	}
}
