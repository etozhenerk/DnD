package aistudio

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func TestCompletionLimitsPrivacyAndUsage(t *testing.T) {
	var calls atomic.Int32
	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.Header.Get("x-data-logging-enabled") != "false" || r.Header.Get("Authorization") != "Bearer test-token" {
			t.Error("privacy/auth headers missing")
		}
		var body struct {
			Model  string `json:"model"`
			Max    int    `json:"max_completion_tokens"`
			Store  bool   `json:"store"`
			Stream bool   `json:"stream"`
			N      int    `json:"n"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		if body.Model != "gpt://test/deepseek-v4-flash" || body.Max != advisor.MaxOutputTokens || body.Store || body.Stream || body.N != 1 {
			t.Error("wrong generation envelope")
		}
		_, err := w.Write([]byte(`{"choices":[{"message":{"content":"**Привет!**"},"finish_reason":"stop"}],"usage":{"prompt_tokens":100,"completion_tokens":200,"prompt_tokens_details":{"cached_tokens":25},"completion_tokens_details":{"reasoning_tokens":150}}}`))
		if err != nil {
			t.Error(err)
		}
	}))
	defer remote.Close()
	client := &Client{model: "gpt://test/deepseek-v4-flash", endpoint: remote.URL, http: remote.Client(), token: func(context.Context) (string, error) { return "test-token", nil }}
	result, err := client.Complete(t.Context(), []advisor.Message{{Role: "user", Content: "test"}})
	if err != nil || result.OutputTokens != 200 || result.CachedTokens != 25 || result.Reply != "**Привет!**" || calls.Load() != 1 {
		t.Fatalf("bad result: %+v err=%v", result, err)
	}
}

func TestMalformedProviderResponses(t *testing.T) {
	for _, value := range []string{
		`{}`, `{"choices":[],"usage":{}}`,
		`{"choices":[{"message":{"content":"ok"},"finish_reason":"stop"}],"usage":{"prompt_tokens":3}}`,
		`{"choices":[{"message":{"content":""},"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":1}}`,
	} {
		if _, err := decodeCompletion([]byte(value)); err == nil {
			t.Fatalf("accepted %s", value)
		}
	}
}

func TestProviderErrorIsNotRetriedOrExposed(t *testing.T) {
	var calls atomic.Int32
	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.WriteHeader(429)
		_, _ = w.Write([]byte("secret-provider-detail"))
	}))
	defer remote.Close()
	client := &Client{endpoint: remote.URL, http: remote.Client(), token: func(context.Context) (string, error) { return "test", nil }}
	_, err := client.Complete(t.Context(), []advisor.Message{{Role: "user", Content: "test"}})
	if err == nil || strings.Contains(err.Error(), "secret-provider-detail") || calls.Load() != 1 {
		t.Fatal("leaked error or repeated paid call")
	}
}
