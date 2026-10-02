package main

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func TestAdvisorLimitsRejectBeforeCallingModel(t *testing.T) {
	for _, scope := range []string{"session", "month", "global_concurrency"} {
		t.Run(scope, func(t *testing.T) {
			model := &advisorModelStub{}
			store, service, _ := advisorTestHandler(t, model)
			session, token, err := service.Create(t.Context())
			if err != nil {
				t.Fatal(err)
			}
			switch scope {
			case "session":
				_, err = store.Pool.Exec(t.Context(), `UPDATE advisor_sessions SET accounted_micro_rub=$2 WHERE id=$1`, session.ID, advisor.SessionBudget-advisor.Reservation()+1)
			case "month":
				_, err = store.Pool.Exec(t.Context(), `INSERT INTO advisor_months(month,accounted_micro_rub) VALUES (date_trunc('month',now() AT TIME ZONE 'Europe/Moscow')::date,$1)`, advisor.MonthlyBudget-advisor.Reservation()+1)
			case "global_concurrency":
				for i := 1; i <= 6; i++ {
					other, secret, createErr := service.Create(t.Context())
					if createErr != nil {
						t.Fatal(createErr)
					}
					_, err = store.ReserveAdvisorTurn(t.Context(), other.ID, advisor.TokenHash(secret), advisorInput(fmt.Sprintf("00000000-0000-0000-0000-%012d", i)))
					if err != nil {
						t.Fatal(err)
					}
				}
			}
			if err != nil {
				t.Fatal(err)
			}
			_, err = service.Send(t.Context(), session.ID, token, advisorInput("00000000-0000-0000-0000-000000000009"))
			if !errors.Is(err, advisor.ErrLimit) || model.calls.Load() != 0 {
				t.Fatalf("limit=%s err=%v calls=%d", scope, err, model.calls.Load())
			}
		})
	}
}

func TestAdvisorDisabledDoesNotUseDatabase(t *testing.T) {
	w := apiRequest(newHandler(nil, nil, nil), http.MethodPost, "/advisor/sessions", "", nil)
	decodeResponse(t, w, 503, nil)
	session, err := advisorRuntime(func(string) string { return "" }, nil, nil)
	if session != nil || err != nil {
		t.Fatalf("default enabled: %v %v", session, err)
	}
}

func TestAdvisorNewSessionRateLimit(t *testing.T) {
	_, service, _ := advisorTestHandler(t, &advisorModelStub{})
	for range 12 {
		if _, _, err := service.Create(t.Context()); err != nil {
			t.Fatal(err)
		}
	}
	if _, _, err := service.Create(t.Context()); !errors.Is(err, advisor.ErrLimit) {
		t.Fatalf("rate limit missing: %v", err)
	}
}
