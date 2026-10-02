package aistudio

import (
	"context"
	"errors"
	"net"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func requestError(ctx context.Context, stage string, err error) error {
	code := "network_error"
	var network net.Error
	switch {
	case errors.Is(ctx.Err(), context.Canceled):
		code = "canceled"
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		code = "deadline"
	case errors.As(err, &network) && network.Timeout():
		code = "timeout"
	}
	return &advisor.CallError{Stage: stage, Code: code}
}
