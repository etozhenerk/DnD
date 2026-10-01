package blobstore

import (
	"bytes"
	"context"
	"crypto/md5"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

// Client never exposes its bucket credentials or storage keys to browsers.
type Client struct {
	baseURL string
	http    *http.Client
	tokens  *tokenSource
}

// New uses the Serverless metadata service; token retrieval is lazy and cached.
func New(bucket string) *Client {
	h := &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return &Client{baseURL: "https://storage.yandexcloud.net/" + url.PathEscape(bucket) + "/", http: h,
		tokens: &tokenSource{client: h, endpoint: "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token"}}
}

func (c *Client) request(ctx context.Context, method, key string, body []byte) (*http.Request, error) {
	token, err := c.tokens.token(ctx)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+key, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return req, nil
}

// Put is immutable and safe to repeat, even after a lost creation response.
func (c *Client) Put(ctx context.Context, asset creator.Asset, body []byte) error {
	req, err := c.request(ctx, http.MethodPut, asset.ObjectKey, body)
	if err != nil {
		return err
	}
	checksum := md5.Sum(body)
	req.Header.Set("Content-MD5", base64.StdEncoding.EncodeToString(checksum[:]))
	req.Header.Set("Content-Type", asset.MIMEType)
	req.Header.Set("If-None-Match", "*")
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("object upload request failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusPreconditionFailed {
		_, err := c.Get(ctx, asset)
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("object upload status %d", resp.StatusCode)
	}
	return nil
}

// Get bounds the body and verifies the persisted digest before serving any bytes.
func (c *Client) Get(ctx context.Context, asset creator.Asset) ([]byte, error) {
	req, err := c.request(ctx, http.MethodGet, asset.ObjectKey, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("object read request failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("object read status %d", resp.StatusCode)
	}
	if asset.SizeBytes < 1 || asset.SizeBytes > 1<<20 {
		return nil, fmt.Errorf("invalid asset size")
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, asset.SizeBytes+1))
	if err != nil {
		return nil, fmt.Errorf("object read failed")
	}
	hash := sha256.Sum256(data)
	if int64(len(data)) != asset.SizeBytes || hex.EncodeToString(hash[:]) != asset.SHA256 {
		return nil, fmt.Errorf("object integrity mismatch")
	}
	return data, nil
}
