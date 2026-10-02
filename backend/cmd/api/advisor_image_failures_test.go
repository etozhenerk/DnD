package main

import (
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func TestInvalidCompletedImageWriterSettlesKnownBillWithoutRetry(t *testing.T) {
	model := &advisorModelStub{failure: &advisor.CallError{Stage: "completion", Code: "invalid_reply", UsageKnown: true}}
	_, service, _ := advisorTestHandler(t, model)
	images := &advisorImageStub{}
	service.EnableImages(images, &advisorObjectStub{data: map[string][]byte{}})
	session, token, err := service.Create(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	in := advisorInput("00000000-0000-0000-0000-000000000097")
	in.Mode = "portrait"
	result, err := service.Send(t.Context(), session.ID, token, in)
	if err != nil || result.Accounted != 220000 || result.Turns[0].Status != "succeeded" || result.Turns[0].Image != nil || images.calls.Load() != 0 {
		t.Fatalf("known writer bill did not settle: %+v %v", result, err)
	}
	if _, err := service.Send(t.Context(), session.ID, token, in); err != nil || model.calls.Load() != 1 {
		t.Fatal("repeated the paid writer")
	}
	model.failure = nil
	in.Mode, in.RequestID = "chat", "00000000-0000-0000-0000-000000000098"
	if _, err := service.Send(t.Context(), session.ID, token, in); err != nil {
		t.Fatal("known writer failure blocked dialogue")
	}
}
