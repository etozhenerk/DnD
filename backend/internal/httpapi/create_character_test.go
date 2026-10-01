package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

type untouchedWriter struct{ calls int }

func (w *untouchedWriter) CreateCharacter(_ context.Context, ch creator.Character) (creator.Character, bool, error) {
	w.calls++
	return ch, true, nil
}

func TestCreationRejectsTransportAndUnapprovedFields(t *testing.T) {
	catalog, err := creator.Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	const prefix = `{"requestId":"6daa09af-bd77-48a9-971e-6ae1b9a49fce","rulesetId":"character-creation-v3","formData":`
	tests := []struct {
		name, body string
		status     int
	}{
		{"not an object", `[]`, 400},
		{"missing request ID", `{"rulesetId":"character-creation-v3","formData":{}}`, 400},
		{"invalid request ID", `{"requestId":"oops","rulesetId":"character-creation-v3","formData":{}}`, 400},
		{"null form", prefix + `null}`, 400},
		{"null name", prefix + `{"appearance":{"displayName":null}}}`, 400},
		{"client creator", prefix + `{},"creatorUserId":"someone"}`, 400},
		{"client HP", prefix + `{"maxHp":999}}`, 400},
		{"client effects", prefix + `{"abilities":{"items":[{"effects":[]}]}}}`, 400},
		{"item numeric effects", prefix + `{"equipment":{"items":[{"effects":[]}]}}}`, 400},
		{"multiple JSON values", prefix + `{}} {}`, 400},
		{"incomplete form", prefix + `{}}`, 422},
		{"old rules", `{"requestId":"6daa09af-bd77-48a9-971e-6ae1b9a49fce","rulesetId":"character-creation-v1","formData":{}}`, 422},
		{"oversized", prefix + `{"appearance":{"story":"` + strings.Repeat("x", 256<<10) + `"}}}`, 413},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			writer := &untouchedWriter{}
			h := CreateCharacterHandler(catalog, writer)
			r := httptest.NewRequest(http.MethodPost, "/characters", strings.NewReader(tt.body))
			r.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != tt.status || writer.calls != 0 {
				t.Fatalf("status=%d want=%d writes=%d", w.Code, tt.status, writer.calls)
			}
			if !json.Valid(w.Body.Bytes()) {
				t.Fatal("error response is not JSON")
			}
		})
	}
}
