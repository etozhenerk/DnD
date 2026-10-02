package aistudio

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func TestImagePromptWriterUsesJSONAndNoChatTools(t *testing.T) {
	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Model     string `json:"model"`
			Reasoning string `json:"reasoning_effort"`
			Max       int    `json:"max_completion_tokens"`
			Format    struct {
				Type string `json:"type"`
			} `json:"response_format"`
			Tools []functionTool `json:"tools"`
		}
		if json.NewDecoder(r.Body).Decode(&body) != nil || body.Model != "gpt://test/yandexgpt-5-lite" || body.Reasoning != "" || body.Max != advisor.ImagePromptMaxOutputTokens || body.Format.Type != "json_object" || len(body.Tools) != 0 {
			t.Error("image writer received unbounded prose or executable tools")
		}
		if _, err := w.Write([]byte(`{"choices":[{"message":{"content":"{\"subject\":\"Герой\"}"},"finish_reason":"stop"}],"usage":{"prompt_tokens":100,"completion_tokens":200}}`)); err != nil {
			t.Error(err)
		}
	}))
	defer remote.Close()
	client := &Client{folder: "test", endpoint: remote.URL, http: remote.Client(), token: func(context.Context) (string, error) { return "test", nil }}
	if _, err := client.Complete(t.Context(), []advisor.Message{{Role: "user", Content: "hero"}}, "image_prompt"); err != nil {
		t.Fatal(err)
	}
}
