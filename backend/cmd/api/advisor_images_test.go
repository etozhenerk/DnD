package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/png"
	"net/http"
	"sync/atomic"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
	"github.com/etozhenerk/DnD/backend/internal/creator"
)

type advisorImageStub struct{ calls atomic.Int32 }

func (s *advisorImageStub) Generate(context.Context, string, string) ([]byte, error) {
	s.calls.Add(1)
	var data bytes.Buffer
	err := png.Encode(&data, image.NewRGBA(image.Rect(0, 0, 1024, 1024)))
	return data.Bytes(), err
}

type advisorObjectStub struct{ data map[string][]byte }

func (s *advisorObjectStub) Put(_ context.Context, asset creator.Asset, data []byte) error {
	s.data[asset.ObjectKey] = append([]byte(nil), data...)
	return nil
}

func (s *advisorObjectStub) Get(_ context.Context, asset creator.Asset) ([]byte, error) {
	data, ok := s.data[asset.ObjectKey]
	if !ok {
		return nil, errors.New("missing object")
	}
	return append([]byte(nil), data...), nil
}

func TestAdvisorImagesArePrivateIdempotentAndAccounted(t *testing.T) {
	model := &advisorModelStub{}
	store, service, handler := advisorTestHandler(t, model)
	imageModel := &advisorImageStub{}
	service.EnableImages(imageModel, &advisorObjectStub{data: map[string][]byte{}})
	session, token, err := service.Create(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	input := advisorInput("00000000-0000-0000-0000-000000000020")
	input.Mode = "portrait"
	path := "/advisor/sessions/" + session.ID
	body, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	response := apiRequest(handler, http.MethodPost, path+"/messages", token, body)
	decodeResponse(t, response, 200, &session)
	recordResponse(t, "advisor-image.json", response)
	if len(session.Turns) != 1 || session.Turns[0].Image == nil || session.Accounted != advisor.ImagePrice || model.calls.Load() != 0 {
		t.Fatalf("wrong image ledger: %+v", session)
	}
	for range 2 {
		decodeResponse(t, apiRequest(handler, http.MethodPost, path+"/messages", token, body), 200, nil)
	}
	if imageModel.calls.Load() != 1 {
		t.Fatal("repeated a paid image")
	}
	imagePath := path + "/images/" + input.RequestID
	binary := apiRequest(handler, http.MethodGet, imagePath, token, nil)
	if binary.Code != 200 || binary.Header().Get("Content-Type") != "image/jpeg" || binary.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("image HTTP=%d", binary.Code)
	}
	if _, _, err := image.DecodeConfig(binary.Body); err != nil {
		t.Fatal("invalid image bytes")
	}
	decodeResponse(t, apiRequest(handler, http.MethodGet, imagePath, "", nil), 401, nil)
	other, secret, err := service.Create(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	decodeResponse(t, apiRequest(handler, http.MethodGet, imagePath, secret, nil), 404, nil)
	if _, _, err := service.Image(t.Context(), other.ID, secret, input.RequestID); !errors.Is(err, advisor.ErrNotFound) {
		t.Fatal("cross-session result readable")
	}
	if _, err := store.Pool.Exec(t.Context(), `UPDATE advisor_sessions SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE id=$1`, session.ID); err != nil {
		t.Fatal(err)
	}
	decodeResponse(t, apiRequest(handler, http.MethodGet, imagePath, token, nil), 404, nil)
}

func TestAdvisorImageQuotaAndInvalidTargetPreventPaidCalls(t *testing.T) {
	store, service, _ := advisorTestHandler(t, &advisorModelStub{})
	model := &advisorImageStub{}
	service.EnableImages(model, &advisorObjectStub{data: map[string][]byte{}})
	session, token, err := service.Create(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i <= 8; i++ {
		in := advisorInput(fmt.Sprintf("00000000-0000-0000-0000-%012d", i))
		in.Mode = "portrait"
		if _, err := service.Send(t.Context(), session.ID, token, in); err != nil {
			t.Fatal(err)
		}
	}
	in := advisorInput("00000000-0000-0000-0000-000000000009")
	in.Mode = "portrait"
	if _, err := service.Send(t.Context(), session.ID, token, in); !errors.Is(err, advisor.ErrLimit) || model.calls.Load() != 8 {
		t.Fatal("image quota failed")
	}
	in.Mode = "icon"
	in.Target = "missing-skill"
	if _, err := service.Send(t.Context(), session.ID, token, in); !errors.Is(err, advisor.ErrInvalid) || model.calls.Load() != 8 {
		t.Fatal("invalid icon target reached provider")
	}
	// The global storage quota also blocks a fresh session before calling AI.
	_, err = store.Pool.Exec(t.Context(), `
		INSERT INTO advisor_turns (session_id, request_id, request_hash, month, message,
			reserved_micro_rub, accounted_micro_rub, model, mode, status, reply,
			input_tokens, output_tokens, cached_tokens)
		SELECT $1, gen_random_uuid(), decode(repeat('00',32),'hex'),
			date_trunc('month', now() AT TIME ZONE 'Europe/Moscow')::date,
			'test quota', 1, 1, 'stub', 'portrait', 'succeeded', 'done', 0, 0, 0
		FROM generate_series(1,120)
	`, session.ID)
	if err != nil {
		t.Fatal(err)
	}
	fresh, secret, err := service.Create(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	in.Mode, in.Target = "portrait", ""
	if _, err := service.Send(t.Context(), fresh.ID, secret, in); !errors.Is(err, advisor.ErrLimit) || model.calls.Load() != 8 {
		t.Fatal("global image quota reached provider")
	}
}
