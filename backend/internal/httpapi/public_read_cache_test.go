package httpapi

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func cacheRequest(handler http.Handler, method, path string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, httptest.NewRequest(method, path, nil))
	return w
}

func writeReadJSON(w http.ResponseWriter, value string) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(value)) // In-memory response recorders cannot fail.
}

func TestReadCacheFreshnessAndKeys(t *testing.T) {
	cache := NewPublicReadCache()
	clock := time.Now()
	cache.now = func() time.Time { return clock }
	var reads int
	h := cache.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reads++
		writeReadJSON(w, fmt.Sprintf(`{"read":%d}`, reads))
	}))
	first := cacheRequest(h, "GET", "/characters?limit=20&offset=0")
	second := cacheRequest(h, "GET", "/characters?offset=0&limit=20")
	if reads != 1 || first.Body.String() != second.Body.String() || !strings.Contains(second.Header().Get("Server-Timing"), `desc="hit"`) {
		t.Fatalf("reads=%d first=%s second=%s timing=%s", reads, first.Body, second.Body, second.Header().Get("Server-Timing"))
	}
	cacheRequest(h, "GET", "/characters?limit=20&offset=20")
	if reads != 2 {
		t.Fatalf("pagination was aliased: reads=%d", reads)
	}
	clock = clock.Add(15 * time.Second)
	cacheRequest(h, "GET", "/characters?limit=20&offset=0")
	if reads != 3 {
		t.Fatalf("expired page did not refresh: reads=%d", reads)
	}
}

func TestReadCacheDoesNotCachePrivateOrErrorResponses(t *testing.T) {
	for _, tc := range []struct {
		name, path, requestHeader, responseHeader, responseValue string
		status                                                   int
	}{
		{name: "draft", path: "/drafts/id", status: 200},
		{name: "bearer", path: "/characters/id", requestHeader: "Authorization", status: 200},
		{name: "cookie", path: "/characters/id", requestHeader: "Cookie", status: 200},
		{name: "missing", path: "/characters/id", status: 404},
		{name: "failure", path: "/characters/id", status: 500},
		{name: "session", path: "/characters/id", responseHeader: "Set-Cookie", responseValue: "session=value", status: 200},
		{name: "vary", path: "/characters/id", responseHeader: "Vary", responseValue: "Accept-Language", status: 200},
		{name: "private", path: "/characters/id", responseHeader: "Cache-Control", responseValue: "private", status: 200},
		{name: "no-store", path: "/characters/id", responseHeader: "Cache-Control", responseValue: "no-store", status: 200},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var reads int
			h := NewPublicReadCache().Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				reads++
				if tc.responseHeader != "" {
					w.Header().Set(tc.responseHeader, tc.responseValue)
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tc.status)
				writeReadJSON(w, `{}`)
			}))
			for range 2 {
				r := httptest.NewRequest("GET", tc.path, nil)
				if tc.requestHeader != "" {
					r.Header.Set(tc.requestHeader, "value")
				}
				h.ServeHTTP(httptest.NewRecorder(), r)
			}
			if reads != 2 {
				t.Fatalf("private/error response cached: reads=%d", reads)
			}
		})
	}
}

func TestReadCacheConcurrentReadsAndCancelledWaiter(t *testing.T) {
	started, release := make(chan struct{}), make(chan struct{})
	var reads atomic.Int32
	h := NewPublicReadCache().Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if reads.Add(1) == 1 {
			close(started)
		}
		select {
		case <-release:
		case <-r.Context().Done():
			return
		}
		writeReadJSON(w, `{"id":"hero"}`)
	}))
	var workers sync.WaitGroup
	workers.Add(1)
	go func() { defer workers.Done(); cacheRequest(h, "GET", "/characters/id") }()
	<-started
	ctx, cancel := context.WithCancel(context.Background())
	waiterDone := make(chan struct{})
	go func() {
		h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/characters/id", nil).WithContext(ctx))
		close(waiterDone)
	}()
	cancel()
	<-waiterDone
	for range 5 {
		workers.Add(1)
		go func() { defer workers.Done(); cacheRequest(h, "GET", "/characters/id") }()
	}
	close(release)
	workers.Wait()
	if reads.Load() != 1 {
		t.Fatalf("concurrent reads duplicated: %d", reads.Load())
	}
}

func TestReadCacheInvalidationDuringRead(t *testing.T) {
	started, release := make(chan struct{}), make(chan struct{})
	var reads atomic.Int32
	h := NewPublicReadCache().Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.WriteHeader(http.StatusCreated)
			return
		}
		if reads.Add(1) == 1 {
			close(started)
			<-release
			writeReadJSON(w, `{"items":[]}`)
			return
		}
		writeReadJSON(w, `{"items":[{"id":"new"}]}`)
	}))
	done := make(chan struct{})
	go func() { cacheRequest(h, "GET", "/characters"); close(done) }()
	<-started
	cacheRequest(h, "POST", "/drafts/id/complete")
	close(release)
	<-done
	second := cacheRequest(h, "GET", "/characters")
	third := cacheRequest(h, "GET", "/characters")
	if reads.Load() != 2 || !strings.Contains(second.Body.String(), "new") || second.Body.String() != third.Body.String() {
		t.Fatalf("write invalidation failed: reads=%d second=%s third=%s", reads.Load(), second.Body, third.Body)
	}
}

func TestReadCacheBoundedAndOversized(t *testing.T) {
	cache := NewPublicReadCache()
	h := cache.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body := `{}`
		if r.URL.Path == "/characters/large" {
			body = strings.Repeat("x", maxReadBody+1)
		}
		writeReadJSON(w, body)
	}))
	for id := range maxReadEntries + 10 {
		cacheRequest(h, "GET", fmt.Sprintf("/characters/%d", id))
	}
	if len(cache.entries) != maxReadEntries {
		t.Fatalf("cache grew past bound: %d", len(cache.entries))
	}
	large := cacheRequest(h, "GET", "/characters/large")
	if large.Body.Len() != maxReadBody+1 {
		t.Fatal("oversized response truncated")
	}
	if _, exists := cache.entries["/characters/large?"]; exists {
		t.Fatal("oversized response cached")
	}
}
