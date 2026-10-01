package httpapi

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

func TestMultipartTransportLimits(t *testing.T) {
	catalog, err := creator.Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	const validJSON = `{"requestId":"6daa09af-bd77-48a9-971e-6ae1b9a49fce","rulesetId":"character-creation-v3","formData":{}}`
	for _, tt := range []struct {
		name   string
		parts  []string
		size   int
		status int
	}{
		{"missing JSON", []string{"portrait"}, 1, 400},
		{"duplicate JSON", []string{"character", "character"}, 0, 400},
		{"unknown part", []string{"character", "anything"}, 1, 400},
		{"duplicate portrait", []string{"character", "portrait", "portrait"}, 1, 400},
		{"portrait limit", []string{"character", "portrait"}, (1 << 20) + 1, 413},
		{"icon limit", []string{"character", "icon:fire"}, (128 << 10) + 1, 413},
		{"valid transport incomplete form", []string{"character", "portrait"}, 1, 422},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var b bytes.Buffer
			m := multipart.NewWriter(&b)
			for _, name := range tt.parts {
				p, err := m.CreateFormField(name)
				if err != nil {
					t.Fatal(err)
				}
				value := strings.Repeat("x", tt.size)
				if name == "character" {
					value = validJSON
				}
				if _, err := p.Write([]byte(value)); err != nil {
					t.Fatal(err)
				}
			}
			if err := m.Close(); err != nil {
				t.Fatal(err)
			}
			r := httptest.NewRequest(http.MethodPost, "/characters", &b)
			r.Header.Set("Content-Type", m.FormDataContentType())
			w := httptest.NewRecorder()
			writer := &untouchedWriter{}
			CreateCharacterHandler(catalog, writer).ServeHTTP(w, r)
			if w.Code != tt.status || writer.calls != 0 {
				t.Fatalf("status=%d want=%d writes=%d", w.Code, tt.status, writer.calls)
			}
		})
	}
}
