package blobstore

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

func TestPrivateUploadRetryReadAndIntegrity(t *testing.T) {
	var tokenCalls atomic.Int32
	var mu sync.Mutex
	var stored []byte
	metadata := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Metadata-Flavor") != "Google" {
			t.Error("missing metadata header")
		}
		tokenCalls.Add(1)
		fmt.Fprint(w, `{"access_token":"test-runtime-token","expires_in":3600}`)
	}))
	defer metadata.Close()
	objects := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-runtime-token" {
			t.Error("runtime identity missing")
		}
		mu.Lock()
		defer mu.Unlock()
		if r.Method == http.MethodPut {
			if r.Header.Get("If-None-Match") != "*" || r.Header.Get("Content-MD5") == "" {
				t.Error("immutable/integrity headers missing")
			}
			if stored != nil {
				w.WriteHeader(412)
				return
			}
			stored = []byte("binary-image")
			w.WriteHeader(200)
			return
		}
		w.Write(stored)
	}))
	defer objects.Close()
	c := New("test-bucket")
	c.baseURL = objects.URL + "/"
	c.tokens.endpoint = metadata.URL
	data := []byte("binary-image")
	digest := sha256.Sum256(data)
	asset := creator.Asset{ObjectKey: "characters/test/image.png", MIMEType: "image/png", SizeBytes: int64(len(data)), SHA256: hex.EncodeToString(digest[:])}
	for range 2 {
		if err := c.Put(t.Context(), asset, data); err != nil {
			t.Fatal(err)
		}
	}
	read, err := c.Get(t.Context(), asset)
	if err != nil || !bytes.Equal(read, data) || tokenCalls.Load() != 1 {
		t.Fatalf("read=%q token_calls=%d error=%v", read, tokenCalls.Load(), err)
	}
	mu.Lock()
	stored = []byte("wrong image")
	mu.Unlock()
	if _, err := c.Get(t.Context(), asset); err == nil {
		t.Fatal("corrupted file was accepted")
	}
}

func TestStorageErrorsNeverExposeTokenOrResponse(t *testing.T) {
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(403); fmt.Fprint(w, "secret contents") }))
	defer s.Close()
	c := New("test-bucket")
	c.tokens.endpoint = s.URL
	_, err := c.Get(t.Context(), creator.Asset{})
	if err == nil || strings.Contains(err.Error(), "secret") {
		t.Fatalf("unsafe error: %v", err)
	}
}
