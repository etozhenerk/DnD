package aistudio

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestImageAPIUsesSupportedParametersAndDoesNotRetry(t *testing.T) {
	var calls atomic.Int32
	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		var body map[string]string
		if json.NewDecoder(r.Body).Decode(&body) != nil || len(body) != 3 || body["model"] != "art://test/aliceai-image-art-3.0" || body["size"] != "1024x1024" || body["prompt"] != "Символ огня" {
			t.Error("unsupported image parameters")
		}
		if r.Header.Get("Authorization") != "Bearer test" || r.Header.Get("x-data-logging-enabled") != "false" {
			t.Error("image privacy headers missing")
		}
		if calls.Load() == 1 {
			if err := json.NewEncoder(w).Encode(map[string]any{"data": []map[string]string{{"b64_json": base64.StdEncoding.EncodeToString([]byte("image bytes"))}}}); err != nil {
				t.Error(err)
			}
			return
		}
		w.WriteHeader(429)
		if _, err := w.Write([]byte("secret provider detail")); err != nil {
			t.Error(err)
		}
	}))
	defer remote.Close()
	client := &Client{folder: "test", imageEndpoint: remote.URL, imageHTTP: remote.Client(), token: func(context.Context) (string, error) { return "test", nil }}
	data, err := client.Generate(t.Context(), "Символ огня", "icon")
	if err != nil || string(data) != "image bytes" || calls.Load() != 1 {
		t.Fatalf("data=%s err=%v calls=%d", data, err, calls.Load())
	}
	if _, err := client.Generate(t.Context(), "Символ огня", "icon"); err == nil || strings.Contains(err.Error(), "secret provider detail") || calls.Load() != 2 {
		t.Fatal("image error leaked or retried")
	}
}
