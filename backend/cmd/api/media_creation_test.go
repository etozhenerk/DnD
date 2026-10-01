package main

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/etozhenerk/DnD/backend/internal/httpapi"
)

type memoryImages struct {
	mu    sync.Mutex
	files map[string][]byte
	fail  bool
}

func (s *memoryImages) Put(ctx context.Context, a creator.Asset, data []byte) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.fail {
		return errors.New("upload failed")
	}
	s.files[a.ID] = bytes.Clone(data)
	return nil
}
func (s *memoryImages) Get(_ context.Context, a creator.Asset) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return bytes.Clone(s.files[a.ID]), nil
}
func mediaTestPNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, 16, 9))
	img.Set(0, 0, color.NRGBA{R: 180, A: 120})
	var b bytes.Buffer
	if err := png.Encode(&b, img); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}
func mediaRequest(t *testing.T, h http.Handler, body []byte, files map[string][]byte) *httptest.ResponseRecorder {
	t.Helper()
	var b bytes.Buffer
	writer := multipart.NewWriter(&b)
	p, err := writer.CreateFormField("character")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := p.Write(body); err != nil {
		t.Fatal(err)
	}
	for name, data := range files {
		p, err := writer.CreateFormFile(name, "test.png")
		if err != nil {
			t.Fatal(err)
		}
		if _, err := p.Write(data); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest(http.MethodPost, "/characters", &b)
	r.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestCharacterImagesRoundTripAndRetry(t *testing.T) {
	store, catalog := testDatabase(t)
	objects := &memoryImages{files: map[string][]byte{}}
	h := httpapi.CreateCharacterWithMediaHandler(catalog, store, objects)
	body := creationBodyBytes(t, catalog, fixtureForm(t, catalog))
	files := map[string][]byte{"portrait": mediaTestPNG(t), "icon:frost": mediaTestPNG(t)}
	var created, replay creator.Character
	decodeResponse(t, mediaRequest(t, h, body, files), 201, &created)
	decodeResponse(t, mediaRequest(t, h, body, files), 200, &replay)
	read, err := store.GetCharacter(t.Context(), created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if created.PortraitURL == "" || read.PortraitURL != created.PortraitURL || replay.PortraitURL != created.PortraitURL || read.Abilities[1].IconURL == "" {
		t.Fatal("media URLs lost on retry or read")
	}
	list, err := store.ListCharacters(t.Context(), 20, 0)
	if err != nil || len(list) != 1 || list[0].PortraitURL != created.PortraitURL {
		t.Fatal("list lost portrait")
	}
	var count int
	if err := store.Pool.QueryRow(t.Context(), "SELECT count(*) FROM character_assets").Scan(&count); err != nil || count != 2 {
		t.Fatalf("asset count=%d error=%v", count, err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /assets/{assetId}", httpapi.GetAssetHandler(store, objects))
	w := apiRequest(mux, http.MethodGet, created.PortraitURL, "", nil)
	if w.Code != 200 || !bytes.Equal(w.Body.Bytes(), files["portrait"]) || w.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("image bytes or headers differ")
	}
	r := httptest.NewRequest(http.MethodGet, created.PortraitURL, nil)
	r.Header.Set("If-None-Match", w.Header().Get("ETag"))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code != 304 || w.Body.Len() != 0 {
		t.Fatal("conditional read was not cached")
	}
	files["portrait"] = bytes.Join([][]byte{files["portrait"], []byte("changed")}, nil)
	decodeResponse(t, mediaRequest(t, h, body, files), 409, nil)
}

func TestInvalidMediaAndUploadFailureCannotSave(t *testing.T) {
	store, catalog := testDatabase(t)
	objects := &memoryImages{files: map[string][]byte{}}
	h := httpapi.CreateCharacterWithMediaHandler(catalog, store, objects)
	body := creationBodyBytes(t, catalog, fixtureForm(t, catalog))
	for _, files := range []map[string][]byte{
		{"portrait": []byte("bad PNG")}, {"icon:unknown": mediaTestPNG(t)}, {"icon:basic-attack": mediaTestPNG(t)},
	} {
		decodeResponse(t, mediaRequest(t, h, body, files), 422, nil)
	}
	if len(objects.files) != 0 {
		t.Fatal("invalid file reached object storage")
	}
	objects.fail = true
	decodeResponse(t, mediaRequest(t, h, body, map[string][]byte{"portrait": mediaTestPNG(t)}), 500, nil)
	if characterCount(t, store) != 0 {
		t.Fatal("failed media left a saved character")
	}
	objects.fail = false
	_, err := store.Pool.Exec(t.Context(), `
        CREATE FUNCTION reject_media() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'test failure'; END $$;
        CREATE TRIGGER reject_media BEFORE INSERT ON character_assets
        FOR EACH ROW EXECUTE FUNCTION reject_media();`)
	if err != nil {
		t.Fatal(err)
	}
	decodeResponse(t, mediaRequest(t, h, body, map[string][]byte{"portrait": mediaTestPNG(t)}), 500, nil)
	if characterCount(t, store) != 0 {
		t.Fatal("SQL media failure left parent character")
	}

	var count int
	if err := store.Pool.QueryRow(t.Context(), "SELECT count(*) FROM character_assets").Scan(&count); err != nil || count != 0 {
		t.Fatal("failed media left references")
	}
}
