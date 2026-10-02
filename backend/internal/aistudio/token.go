package aistudio

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

type runtimeToken struct {
	mu       sync.Mutex
	http     *http.Client
	endpoint string
	value    string
	expires  time.Time
}

func (s *runtimeToken) get(ctx context.Context) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.value != "" && time.Until(s.expires) > time.Minute {
		return s.value, nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.endpoint, nil)
	if err != nil {
		return "", fmt.Errorf("create runtime identity request")
	}
	req.Header.Set("Metadata-Flavor", "Google")
	resp, err := s.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("runtime identity unavailable")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("runtime identity status %d", resp.StatusCode)
	}
	var token struct {
		Value    string `json:"access_token"`
		Lifetime int64  `json:"expires_in"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 32<<10)).Decode(&token); err != nil ||
		token.Value == "" || token.Lifetime < 120 || token.Lifetime > 86400 {
		return "", fmt.Errorf("invalid runtime identity response")
	}
	s.value, s.expires = token.Value, time.Now().Add(time.Duration(token.Lifetime)*time.Second)
	return s.value, nil
}
