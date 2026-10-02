package aistudio

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

// Generate requests one image, with no automatic retry or user photo upload.
func (c *Client) Generate(ctx context.Context, prompt, kind string) ([]byte, error) {
	if kind != "portrait" && kind != "icon" {
		return nil, fmt.Errorf("unsupported image kind")
	}
	size := "1024x1536"
	if kind == "icon" {
		size = "1024x1024"
	}
	model := "art://" + c.folder + "/" + advisor.ImageModelName
	body, err := json.Marshal(struct {
		Model  string `json:"model"`
		Prompt string `json:"prompt"`
		Size   string `json:"size"`
	}{model, prompt, size})
	if err != nil {
		return nil, fmt.Errorf("serialize image request")
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.imageEndpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create image request")
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-data-logging-enabled", "false")
	resp, err := c.imageHTTP.Do(req)
	if err != nil {
		return nil, requestError(ctx, "image", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, &advisor.CallError{Stage: "image", Code: "http_status", HTTPStatus: resp.StatusCode}
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, (16<<20)+1))
	if err != nil || len(raw) > 16<<20 {
		return nil, fmt.Errorf("image response exceeded limit")
	}
	var result struct {
		Data []struct {
			Base64 string `json:"b64_json"`
		} `json:"data"`
	}
	if json.Unmarshal(raw, &result) != nil || len(result.Data) != 1 {
		return nil, fmt.Errorf("invalid image response")
	}
	data, err := base64.StdEncoding.DecodeString(result.Data[0].Base64)
	if err != nil || len(data) == 0 || len(data) > 10<<20 {
		return nil, fmt.Errorf("invalid image bytes")
	}
	return data, nil
}
