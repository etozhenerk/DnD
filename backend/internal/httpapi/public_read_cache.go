package httpapi

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	maxReadEntries = 128
	maxReadBody    = 256 << 10
)

type readEntry struct {
	response *readResponse
	expires  time.Time
}

// PublicReadCache caches successful public JSON reads within one API process.
// Authenticated requests, errors and draft data never enter the cache.
type PublicReadCache struct {
	mu         sync.Mutex
	entries    map[string]readEntry
	pending    map[string]chan struct{}
	generation uint64
	now        func() time.Time
}

// NewPublicReadCache creates a bounded cache; no goroutines or external service are needed.
func NewPublicReadCache() *PublicReadCache {
	return &PublicReadCache{
		entries: make(map[string]readEntry),
		pending: make(map[string]chan struct{}),
		now:     time.Now,
	}
}

// Wrap must be inside access/CORS middleware so every cache hit is checked again.
func (c *PublicReadCache) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ttl := publicReadTTL(r)
		if ttl == 0 {
			c.serveUncached(w, r, next)
			return
		}
		started := time.Now()
		key := r.URL.EscapedPath() + "?" + r.URL.Query().Encode()
		for {
			if r.Context().Err() != nil {
				return
			}
			c.mu.Lock()
			if entry, ok := c.entries[key]; ok && c.now().Before(entry.expires) {
				c.mu.Unlock()
				entry.response.send(w, started, "hit")
				return
			}
			if done, ok := c.pending[key]; ok {
				c.mu.Unlock()
				select {
				case <-done:
					continue
				case <-r.Context().Done():
					return
				}
			}
			c.pending[key] = make(chan struct{})
			generation := c.generation
			c.mu.Unlock()
			c.load(w, r, next, key, ttl, started, generation)
			return
		}
	})
}

func (c *PublicReadCache) load(w http.ResponseWriter, r *http.Request, next http.Handler, key string, ttl time.Duration, started time.Time, generation uint64) {
	// Release waiters even if a handler panics; the HTTP server owns panic recovery.
	defer func() {
		c.mu.Lock()
		close(c.pending[key])
		delete(c.pending, key)
		c.mu.Unlock()
	}()
	response := newReadResponse()
	next.ServeHTTP(response, r)
	if r.Context().Err() == nil && response.cacheable() {
		c.mu.Lock()
		if generation == c.generation {
			c.evictExpired()
			c.entries[key] = readEntry{response: response, expires: c.now().Add(ttl)}
		}
		c.mu.Unlock()
	}
	response.send(w, started, "miss")
}

func (c *PublicReadCache) evictExpired() {
	now := c.now()
	for key, entry := range c.entries {
		if !now.Before(entry.expires) {
			delete(c.entries, key)
		}
	}
	if len(c.entries) < maxReadEntries {
		return
	}
	var oldest string
	var deadline time.Time
	for key, entry := range c.entries {
		if oldest == "" || entry.expires.Before(deadline) {
			oldest, deadline = key, entry.expires
		}
	}
	delete(c.entries, oldest)
}

func (c *PublicReadCache) serveUncached(w http.ResponseWriter, r *http.Request, next http.Handler) {
	if r.Method == http.MethodGet && r.URL.Path == "/characters" && r.URL.Query().Get("fresh") == "true" {
		started := time.Now()
		response := newReadResponse()
		next.ServeHTTP(response, r)
		response.send(w, started, "bypass")
		return
	}
	isCreation := r.URL.Path == "/characters"
	isCompletion := strings.HasPrefix(r.URL.Path, "/drafts/") && strings.HasSuffix(r.URL.Path, "/complete")
	if r.Method != http.MethodPost || (!isCreation && !isCompletion) {
		next.ServeHTTP(w, r)
		return
	}
	observer := &writeObserver{ResponseWriter: w}
	next.ServeHTTP(observer, r)
	if observer.status == http.StatusCreated || isCreation && observer.status == http.StatusOK {
		c.mu.Lock()
		c.generation++
		clear(c.entries)
		c.mu.Unlock()
	}
}

func publicReadTTL(r *http.Request) time.Duration {
	if r.Method != http.MethodGet || r.Header.Get("Authorization") != "" || r.Header.Get("Cookie") != "" {
		return 0
	}
	switch {
	case r.URL.Path == "/creator/options":
		return 5 * time.Minute
	case r.URL.Path == "/characters":
		if r.URL.Query().Get("fresh") == "true" {
			return 0
		}
		return 15 * time.Second
	case strings.HasPrefix(r.URL.Path, "/characters/") && !strings.Contains(strings.TrimPrefix(r.URL.Path, "/characters/"), "/"):
		return time.Minute
	default:
		return 0
	}
}
