// Package aistudio calls the Yandex OpenAI-compatible text API.
package aistudio

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

// Client uses one reusable HTTP client and the runtime's short-lived IAM token.
// It never retries a completion or exposes provider bodies in errors.
type Client struct {
	model         string
	folder        string
	endpoint      string
	http          *http.Client
	imageHTTP     *http.Client
	imageEndpoint string
	token         func(context.Context) (string, error)
}

// New pins the model and pricing; it does not store a long-lived API key.
func New(folderID string) *Client {
	h := &http.Client{Timeout: 22 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	tokens := &runtimeToken{http: h, endpoint: "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token"}
	return &Client{model: "gpt://" + folderID + "/" + advisor.ModelName, folder: folderID,
		imageHTTP:     &http.Client{Timeout: 80 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }},
		imageEndpoint: "https://ai.api.cloud.yandex.net/v1/images/generations",
		endpoint:      "https://ai.api.cloud.yandex.net/v1/chat/completions", http: h, token: tokens.get}
}

// Complete limits visible output plus reasoning to the reserved token envelope.
// store=false and x-data-logging-enabled=false avoid provider conversation storage.
func (c *Client) Complete(ctx context.Context, messages []advisor.Message, mode string) (advisor.Completion, error) {
	maxTokens := 1536
	var format *struct {
		Type string `json:"type"`
	}
	if mode == "comment" {
		maxTokens = 384
	}
	if mode == "fill" || mode == "suggest" {
		maxTokens = advisor.MaxOutputTokens
		format = &struct {
			Type string `json:"type"`
		}{Type: "json_object"}
	}
	body, err := json.Marshal(struct {
		Reasoning string `json:"reasoning_effort"`
		Format    *struct {
			Type string `json:"type"`
		} `json:"response_format,omitempty"`
		Model     string            `json:"model"`
		Messages  []advisor.Message `json:"messages"`
		MaxTokens int               `json:"max_completion_tokens"`
		Store     bool              `json:"store"`
		Stream    bool              `json:"stream"`
		N         int               `json:"n"`
	}{"low", format, c.model, messages, maxTokens, false, false, 1})
	if err != nil {
		return advisor.Completion{}, fmt.Errorf("serialize completion request")
	}
	token, err := c.token(ctx)
	if err != nil {
		return advisor.Completion{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
	if err != nil {
		return advisor.Completion{}, fmt.Errorf("create completion request")
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-data-logging-enabled", "false")
	resp, err := c.http.Do(req)
	if err != nil {
		return advisor.Completion{}, fmt.Errorf("completion request failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return advisor.Completion{}, fmt.Errorf("completion status %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, (256<<10)+1))
	if err != nil || len(data) > 256<<10 {
		return advisor.Completion{}, fmt.Errorf("completion response exceeded limit")
	}
	return decodeCompletion(data)
}

func decodeCompletion(data []byte) (advisor.Completion, error) {
	var body struct {
		Choices []struct {
			Message struct {
				Content string  `json:"content"`
				Refusal *string `json:"refusal"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage *struct {
			Input   *int `json:"prompt_tokens"`
			Output  *int `json:"completion_tokens"`
			Details struct {
				Cached int `json:"cached_tokens"`
			} `json:"prompt_tokens_details"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(data, &body); err != nil || len(body.Choices) != 1 || body.Usage == nil ||
		body.Usage.Input == nil || body.Usage.Output == nil {
		return advisor.Completion{}, fmt.Errorf("incomplete completion response")
	}
	choice := body.Choices[0]
	reply := strings.TrimSpace(choice.Message.Content)
	if !utf8.ValidString(reply) || reply == "" || utf8.RuneCountInString(reply) > 16000 || strings.ContainsRune(reply, 0) ||
		(choice.FinishReason != "stop" && choice.FinishReason != "length") {
		return advisor.Completion{}, fmt.Errorf("invalid completion reply")
	}
	return advisor.Completion{Reply: reply, InputTokens: *body.Usage.Input, OutputTokens: *body.Usage.Output, CachedTokens: body.Usage.Details.Cached}, nil
}
