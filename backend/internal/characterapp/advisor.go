package characterapp

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

// AdvisorStore owns durable admission, idempotency and accounting.
type AdvisorStore interface {
	CreateAdvisorSession(context.Context, []byte) (advisor.Session, error)
	GetAdvisorSession(context.Context, string, []byte) (advisor.Session, error)
	ReserveAdvisorTurn(context.Context, string, []byte, advisor.Input) (bool, error)
	SettleAdvisorTurn(context.Context, string, string, advisor.Completion) error
	MarkAdvisorUncertain(context.Context, string, string, bool) error
}

// AdvisorModel never retries a paid completion automatically.
type AdvisorModel interface {
	Complete(context.Context, []advisor.Message, string) (advisor.Completion, error)
}

// Advisor coordinates a dialogue; it has no character writer or draft dependency.
type Advisor struct {
	store   AdvisorStore
	model   AdvisorModel
	prompt  *advisor.Prompt
	images  AdvisorImageModel
	objects AdvisorObjects
}

// NewAdvisor requires prepared persistence, approved prompt and a configured model.
func NewAdvisor(store AdvisorStore, model AdvisorModel, prompt *advisor.Prompt) *Advisor {
	return &Advisor{store: store, model: model, prompt: prompt}
}

// Create returns its capability only on this response, not in subsequent reads.
func (a *Advisor) Create(ctx context.Context) (advisor.Session, string, error) {
	token, hash, err := advisor.NewToken()
	if err != nil {
		return advisor.Session{}, "", err
	}
	session, err := a.store.CreateAdvisorSession(ctx, hash)
	if err != nil {
		return advisor.Session{}, "", err
	}
	return session, token, nil
}

// Read never resolves an ambiguous paid outcome by resubmitting it.
func (a *Advisor) Read(ctx context.Context, id, token string) (advisor.Session, error) {
	if !advisor.ValidAccess(id, token) {
		return advisor.Session{}, advisor.ErrNotFound
	}
	session, err := a.store.GetAdvisorSession(ctx, id, advisor.TokenHash(token))
	for i := range session.Turns {
		a.prompt.DecodeTurn(&session.Turns[i])
	}
	return session, err
}

// Send returns the stored state for duplicates; only a successful reservation
// grants this process permission to call the provider once.
func (a *Advisor) Send(ctx context.Context, id, token string, in advisor.Input) (advisor.Session, error) {
	timeout := 26 * time.Second
	if in.Mode == "" || in.Mode == "chat" || in.Mode == "fill" || in.Mode == "suggest" {
		timeout = 70 * time.Second
	}
	if in.Mode == "portrait" || in.Mode == "icon" {
		if !a.ImagesEnabled() {
			return advisor.Session{}, advisor.ErrUnavailable
		}
		timeout = 110 * time.Second
	}
	requestCtx, requestCancel := context.WithTimeout(ctx, timeout)
	defer requestCancel()
	ctx = requestCtx
	in.RequestID = strings.ToLower(in.RequestID)
	if err := in.Validate(); err != nil {
		return advisor.Session{}, err
	}
	history, err := a.Read(ctx, id, token)
	if err != nil {
		return advisor.Session{}, err
	}
	messages, err := a.prompt.Messages(history.Turns, in)
	if err != nil {
		return advisor.Session{}, err
	}
	fresh, err := a.store.ReserveAdvisorTurn(ctx, id, advisor.TokenHash(token), in)
	if err != nil {
		return advisor.Session{}, err
	}
	if !fresh {
		return a.Read(ctx, id, token)
	}
	// A previous turn may have settled between admission and the first read.
	// Refresh after reservation so this reply always sees that completed turn.
	history, err = a.Read(ctx, id, token)
	if err != nil {
		return advisor.Session{}, err
	}
	messages, err = a.prompt.Messages(history.Turns, in)
	if err != nil {
		return advisor.Session{}, err
	}
	result, callErr := a.generate(ctx, id, in, messages)
	// Accounting is a bounded inline cleanup even if the browser disconnected;
	// no goroutine continues a paid call after the request finishes.
	finishCtx, finishCancel := context.WithTimeout(context.WithoutCancel(ctx), 3*time.Second)
	defer finishCancel()
	if err := a.finish(finishCtx, id, in.RequestID, result, callErr); err != nil {
		return advisor.Session{}, err
	}
	return a.Read(finishCtx, id, token)
}

func (a *Advisor) finish(ctx context.Context, id, requestID string, result advisor.Completion, callErr error) error {
	_, usageErr := advisor.Cost(result)
	if callErr != nil || usageErr != nil {
		if err := a.store.MarkAdvisorUncertain(ctx, id, requestID, callErr == nil && usageErr != nil); err != nil {
			return fmt.Errorf("record uncertain advisor turn: %w", err)
		}
		return advisor.ErrUnavailable
	}
	if err := a.store.SettleAdvisorTurn(ctx, id, requestID, result); err != nil {
		return fmt.Errorf("settle advisor turn: %w", err)
	}
	return nil
}
