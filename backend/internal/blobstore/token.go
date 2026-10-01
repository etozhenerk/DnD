// Package blobstore accesses private Yandex Object Storage with the runtime identity.
package blobstore

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type tokenSource struct {
	mu       sync.Mutex
	value    string
	expires  time.Time
	client   *http.Client
	endpoint string
}

func (s *tokenSource) token(ctx context.Context) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.value != "" && time.Until(s.expires) > time.Minute {
		return s.value, nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.endpoint, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Metadata-Flavor", "Google")
	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("runtime token request failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("runtime token status %d", resp.StatusCode)
	}
	var token struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(nil, resp.Body, 32<<10)).Decode(&token); err != nil || token.AccessToken == "" || token.ExpiresIn < 120 {
		return "", fmt.Errorf("invalid runtime token response")
	}
	s.value, s.expires = token.AccessToken, time.Now().Add(time.Duration(token.ExpiresIn)*time.Second)
	return s.value, nil
}
