package aistudio

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func TestCallDiagnosticsDoNotExposeProviderOrRequestData(t *testing.T) {
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	err := requestError(ctx, "completion", errors.New("secret request URL and token"))
	var failure *advisor.CallError
	if !errors.As(err, &failure) || failure.Code != "canceled" || strings.Contains(err.Error(), "secret") {
		t.Fatalf("unsafe diagnostic: %v", err)
	}
}

func TestEmptyCompletedReplyRetainsKnownUsage(t *testing.T) {
	result, err := decodeCompletion([]byte(`{"choices":[{"message":{"content":""},"finish_reason":"length"}],"usage":{"prompt_tokens":100,"completion_tokens":1024}}`))
	var failure *advisor.CallError
	if !errors.As(err, &failure) || !failure.UsageKnown || result.InputTokens != 100 || result.OutputTokens != 1024 || result.Reply != "" {
		t.Fatalf("known bill discarded: %+v %v", result, err)
	}
}
