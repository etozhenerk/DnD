package httpapi

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
	"github.com/etozhenerk/DnD/backend/internal/characterapp"
)

// AdvisorHandlers expose a capability-scoped dialogue, never character drafts.
type AdvisorHandlers struct{ Service *characterapp.Advisor }

// Create makes no paid model call and returns its bearer token only once.
func (h AdvisorHandlers) Create(w http.ResponseWriter, r *http.Request) {
	if !h.ready(w) {
		return
	}
	// This endpoint has no request body; do not accept arbitrary stored payloads.
	if r.ContentLength != 0 {
		writeCreationError(w, 400, "invalid_json", "Начало диалога не принимает анкету.")
		return
	}
	session, token, err := h.Service.Create(r.Context())
	if err != nil {
		advisorFailure(w, err)
		return
	}
	writeCreationJSON(w, http.StatusCreated, struct {
		Session advisor.Session `json:"session"`
		Token   string          `json:"token"`
	}{session, token})
}

// Read checks the session bearer before returning history or cost.
func (h AdvisorHandlers) Read(w http.ResponseWriter, r *http.Request) {
	id, token, ok := advisorAuth(w, r)
	if !ok || !h.ready(w) {
		return
	}
	session, err := h.Service.Read(r.Context(), id, token)
	if err != nil {
		advisorFailure(w, err)
		return
	}
	writeCreationJSON(w, http.StatusOK, session)
}

// Send translates schema/limit errors and never exposes raw provider responses.
func (h AdvisorHandlers) Send(w http.ResponseWriter, r *http.Request) {
	id, token, ok := advisorAuth(w, r)
	if !ok || !h.ready(w) {
		return
	}
	in, err := decodeAdvisorMessage(w, r)
	if err != nil {
		writeCreationError(w, 400, "invalid_advisor_message", "Проверь реплику и контекст героя.")
		return
	}
	session, err := h.Service.Send(r.Context(), id, token, in)
	if err != nil {
		advisorFailure(w, err)
		return
	}
	status := http.StatusOK
	for _, turn := range session.Turns {
		if turn.RequestID == in.RequestID && turn.Status != "succeeded" {
			status = http.StatusAccepted
		}
	}
	writeCreationJSON(w, status, session)
}

func (h AdvisorHandlers) ready(w http.ResponseWriter) bool {
	if h.Service != nil {
		return true
	}
	writeCreationError(w, 503, "advisor_unavailable", "Сова пока обустраивает библиотеку. Диалог скоро заработает.")
	return false
}

func advisorAuth(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if token == r.Header.Get("Authorization") || len(token) != 43 {
		writeCreationError(w, 401, "advisor_token_required", "Нужен секрет этого диалога.")
		return "", "", false
	}
	id := r.PathValue("sessionId")
	if !advisor.ValidAccess(id, token) {
		writeCreationError(w, 404, "not_found", "Диалог не найден.")
		return "", "", false
	}
	return id, token, true
}

func advisorFailure(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, advisor.ErrNotFound):
		writeCreationError(w, 404, "not_found", "Диалог не найден или уже закончился.")
	case errors.Is(err, advisor.ErrInvalid):
		writeCreationError(w, 400, "invalid_advisor_message", "Проверь реплику и выбранный класс или расу.")
	case errors.Is(err, advisor.ErrConflict):
		writeCreationError(w, 409, "advisor_request_conflict", "Эта попытка уже использована для другой реплики.")
	case errors.Is(err, advisor.ErrBusy):
		writeCreationError(w, 409, "advisor_busy", "Предыдущая реплика ещё не завершена. Проверь её ответ.")
	case errors.Is(err, advisor.ErrLimit):
		writeCreationError(w, 429, "advisor_limit", "Достигнут лимит диалога, общего бюджета или частоты. Попробуй позже.")
	case errors.Is(err, advisor.ErrUnavailable):
		writeCreationError(w, 503, "advisor_uncertain", "Ответ потерялся. Проверь диалог перед новой отправкой.")
	default:
		slog.Error("advisor operation failed", "error_type", fmt.Sprintf("%T", err))
		writeCreationError(w, 503, "advisor_unavailable", "Не удалось продолжить диалог. Проверь предыдущий ответ.")
	}
}
