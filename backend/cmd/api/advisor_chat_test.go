package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
	"github.com/etozhenerk/DnD/backend/internal/characterapp"
	"github.com/etozhenerk/DnD/backend/internal/storage"
)

type advisorModelStub struct {
	calls   atomic.Int32
	failure error
	reply   string
	entered chan struct{}
	release chan struct{}
}

func (m *advisorModelStub) Complete(ctx context.Context, _ []advisor.Message, _ string) (advisor.Completion, error) {
	m.calls.Add(1)
	if m.entered != nil {
		close(m.entered)
	}
	if m.release != nil {
		select {
		case <-m.release:
		case <-ctx.Done():
			return advisor.Completion{}, ctx.Err()
		}
	}
	reply := m.reply
	if reply == "" {
		reply = "**Советник:** выбери характер героя!"
	}
	return advisor.Completion{Reply: reply, InputTokens: 1000, OutputTokens: 100, CachedTokens: 0}, m.failure
}

func advisorTestHandler(t *testing.T, model *advisorModelStub) (*storage.Store, *characterapp.Advisor, http.Handler) {
	t.Helper()
	store, catalog := testDatabase(t)
	migration, err := os.ReadFile("../../migrations/000006_advisor_sessions.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.Pool.Exec(t.Context(), string(migration)); err != nil {
		t.Fatal(err)
	}
	tools, err := os.ReadFile("../../migrations/000008_advisor_tools.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.Pool.Exec(t.Context(), string(tools)); err != nil {
		t.Fatal(err)
	}
	prompt, err := advisor.LoadPrompt("../../../shared/advisor/persona.md", "../../../content/world-map.json", catalog)
	if err != nil {
		t.Fatal(err)
	}
	guide, err := advisor.Load("../../../shared/advisor/guide.json")
	if err != nil {
		t.Fatal(err)
	}
	service := characterapp.NewAdvisor(store, model, prompt)
	return store, service, newHandlerWithAdvisorRuntime(catalog, store, []string{"https://example.test"}, nil, guide, service)
}

func advisorInput(id string) advisor.Input {
	return advisor.Input{RequestID: id, Message: "Придумай имя", Context: advisor.Context{StepID: "appearance", Name: "Лесной герой"}}
}

func TestAdvisorChatPrivacyIdempotencyAndContract(t *testing.T) {
	model := &advisorModelStub{}
	store, service, handler := advisorTestHandler(t, model)
	w := apiRequest(handler, http.MethodPost, "/advisor/sessions", "", nil)
	var created struct {
		Session advisor.Session `json:"session"`
		Token   string          `json:"token"`
	}
	decodeResponse(t, w, 201, &created)
	recordResponse(t, "advisor-created.json", w)
	if model.calls.Load() != 0 {
		t.Fatal("creation called paid provider")
	}
	path := "/advisor/sessions/" + created.Session.ID
	decodeResponse(t, apiRequest(handler, http.MethodGet, path, "", nil), 401, nil)
	other, _, err := advisor.NewToken()
	if err != nil {
		t.Fatal(err)
	}
	decodeResponse(t, apiRequest(handler, http.MethodGet, path, other, nil), 404, nil)
	in := advisorInput("00000000-0000-0000-0000-000000000001")
	body, err := json.Marshal(in)
	if err != nil {
		t.Fatal(err)
	}
	w = apiRequest(handler, http.MethodPost, path+"/messages", created.Token, body)
	var session advisor.Session
	decodeResponse(t, w, 200, &session)
	recordResponse(t, "advisor-session.json", w)
	if len(session.Turns) != 1 || session.Turns[0].Status != "succeeded" || session.Accounted != 350000 {
		t.Fatalf("bad ledger: %+v", session)
	}
	if strings.Contains(w.Body.String(), created.Token) || strings.Contains(w.Body.String(), "Лесной герой") || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("leaked token/snapshot or cached history")
	}
	for range 2 {
		decodeResponse(t, apiRequest(handler, http.MethodPost, path+"/messages", created.Token, body), 200, nil)
	}
	if model.calls.Load() != 1 {
		t.Fatalf("calls=%d want=1", model.calls.Load())
	}
	in.Message = "другая реплика"
	body, err = json.Marshal(in)
	if err != nil {
		t.Fatal(err)
	}
	decodeResponse(t, apiRequest(handler, http.MethodPost, path+"/messages", created.Token, body), 409, nil)
	if _, err := store.Pool.Exec(t.Context(), `UPDATE advisor_sessions SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE id=$1`, session.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Read(t.Context(), session.ID, created.Token); !errors.Is(err, advisor.ErrNotFound) {
		t.Fatal("expired session readable")
	}
	decodeResponse(t, apiRequest(handler, http.MethodPost, "/drafts", "", nil), 403, nil)
}

func TestAdvisorConcurrentRepeatMakesOnePaidCall(t *testing.T) {
	model := &advisorModelStub{entered: make(chan struct{}), release: make(chan struct{})}
	store, service, _ := advisorTestHandler(t, model)
	session, token, err := service.Create(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	in := advisorInput("00000000-0000-0000-0000-000000000001")
	done := make(chan error, 1)
	go func() { _, err := service.Send(t.Context(), session.ID, token, in); done <- err }()
	<-model.entered
	var wg sync.WaitGroup
	for range 3 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			same, err := service.Send(t.Context(), session.ID, token, in)
			if err != nil || len(same.Turns) != 1 || same.Turns[0].Status != "reserved" {
				t.Errorf("repeat: %+v %v", same, err)
			}
		}()
	}
	wg.Wait()
	next := advisorInput("00000000-0000-0000-0000-000000000002")
	if _, err := service.Send(t.Context(), session.ID, token, next); !errors.Is(err, advisor.ErrBusy) {
		t.Fatalf("concurrent different request: %v", err)
	}
	close(model.release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	if model.calls.Load() != 1 {
		t.Fatalf("calls=%d want=1", model.calls.Load())
	}
	var total int64
	if err := store.Pool.QueryRow(t.Context(), `SELECT accounted_micro_rub FROM advisor_months`).Scan(&total); err != nil || total != 350000 {
		t.Fatalf("monthly ledger=%d err=%v", total, err)
	}
}

func TestAdvisorAmbiguousFailureRetainsReservation(t *testing.T) {
	model := &advisorModelStub{failure: errors.New("lost provider response")}
	_, service, _ := advisorTestHandler(t, model)
	session, token, err := service.Create(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	in := advisorInput("00000000-0000-0000-0000-000000000001")
	if _, err := service.Send(t.Context(), session.ID, token, in); !errors.Is(err, advisor.ErrUnavailable) {
		t.Fatalf("wrong provider error: %v", err)
	}
	same, err := service.Send(t.Context(), session.ID, token, in)
	if err != nil || same.Accounted != advisor.Reservation() || same.Turns[0].Status != "uncertain" {
		t.Fatalf("lost reserve: %+v %v", same, err)
	}
	if model.calls.Load() != 1 {
		t.Fatal("ambiguous request resubmitted")
	}
}

func TestAdvisorFillPersistsProposalWithoutCreatingCharacter(t *testing.T) {
	model := &advisorModelStub{reply: `{"reply":"Беру перо!","character":{"appearance":{"displayName":"Алес","pronouns":"он","appearance":"Лесной плащ","story":"Странник","motivation":"Вернуть долг","personality":["Хитрый"]},"raceId":"elves","classId":"rogue","skills":[],"equipment":[]}}`}
	store, service, handler := advisorTestHandler(t, model)
	session, token, err := service.Create(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	input := advisorInput("00000000-0000-0000-0000-000000000045")
	input.Mode = "fill"
	var before, after int
	if err := store.Pool.QueryRow(t.Context(), "SELECT count(*) FROM characters").Scan(&before); err != nil {
		t.Fatal(err)
	}
	result, err := service.Send(t.Context(), session.ID, token, input)
	if err != nil || len(result.Turns) != 1 || result.Turns[0].Proposal == nil {
		t.Fatalf("proposal not returned: %+v err=%v", result, err)
	}
	duplicate, err := service.Send(t.Context(), session.ID, token, input)
	if err != nil || model.calls.Load() != 1 || duplicate.Accounted != result.Accounted || duplicate.Turns[0].Proposal == nil {
		t.Fatal("fill repeated or lost its stored proposal")
	}
	if err := store.Pool.QueryRow(t.Context(), "SELECT count(*) FROM characters").Scan(&after); err != nil || after != before {
		t.Fatal("advisor created a character without player acceptance")
	}
	response := apiRequest(handler, http.MethodGet, "/advisor/sessions/"+session.ID, token, nil)
	recordResponse(t, "advisor-proposal.json", response)
	if response.Code != 200 {
		t.Fatalf("read proposal status=%d", response.Code)
	}
}
