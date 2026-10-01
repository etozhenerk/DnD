package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

const creationTestID = "6daa09af-bd77-48a9-971e-6ae1b9a49fce"

func creationBodyBytes(t *testing.T, c *creator.Catalog, form map[string]json.RawMessage) []byte {
	t.Helper()
	body, err := json.Marshal(map[string]any{
		"requestId": creationTestID, "rulesetId": c.RulesetID, "formData": form,
	})
	if err != nil {
		t.Fatal(err)
	}
	return body
}

func TestWholeCharacterCreationAndRetry(t *testing.T) {
	store, catalog := testDatabase(t)
	h := newHandler(catalog, store, nil)
	form := fixtureForm(t, catalog)
	form["equipment"] = json.RawMessage(`{"items":[{"id":"staff","name":"Посох","description":"Дорожный посох"}]}`)
	body := creationBodyBytes(t, catalog, form)
	var created, replay, read creator.Character
	w := apiRequest(h, http.MethodPost, "/characters", "", body)
	decodeResponse(t, w, http.StatusCreated, &created)
	recordResponse(t, "created-character.json", w)
	recordResponse(t, "create-character-request.json", &httptest.ResponseRecorder{Body: bytes.NewBuffer(body)})
	if w.Header().Get("Location") != "/characters/"+creationTestID || created.ID != creationTestID {
		t.Fatalf("wrong creation location or ID: %s", w.Header().Get("Location"))
	}
	decodeResponse(t, apiRequest(h, http.MethodPost, "/characters", "", body), http.StatusOK, &replay)
	decodeResponse(t, apiRequest(h, http.MethodGet, "/characters/"+created.ID, "", nil), http.StatusOK, &read)
	if !reflect.DeepEqual(created, replay) || !reflect.DeepEqual(created, read) || characterCount(t, store) != 1 {
		t.Fatal("retry or read changed the saved snapshot")
	}
	var creatorID *string
	var drafts int
	if err := store.Pool.QueryRow(t.Context(), "SELECT creator_user_id::text FROM characters WHERE id=$1", created.ID).Scan(&creatorID); err != nil || creatorID != nil {
		t.Fatalf("anonymous character has creator: %v", err)
	}
	if err := store.Pool.QueryRow(t.Context(), "SELECT count(*) FROM character_drafts").Scan(&drafts); err != nil || drafts != 0 {
		t.Fatalf("unexpected server draft: %d error=%v", drafts, err)
	}
	decodeResponse(t, apiRequest(h, http.MethodPost, "/drafts", "", nil), http.StatusForbidden, nil)
}

func TestConcurrentWholeFormRetryAndConflict(t *testing.T) {
	store, catalog := testDatabase(t)
	h := newHandler(catalog, store, nil)
	form := fixtureForm(t, catalog)
	body := creationBodyBytes(t, catalog, form)
	results := make(chan int, 2)
	for range 2 {
		go func() { results <- apiRequest(h, http.MethodPost, "/characters", "", body).Code }()
	}
	statuses := map[int]int{}
	for range 2 {
		statuses[<-results]++
	}
	if statuses[201] != 1 || statuses[200] != 1 || characterCount(t, store) != 1 {
		t.Fatalf("duplicate submission created extra character: %v", statuses)
	}
	form["appearance"] = json.RawMessage(`{"displayName":"Другая анкета"}`)
	decodeResponse(t, apiRequest(h, http.MethodPost, "/characters", "", creationBodyBytes(t, catalog, form)), http.StatusConflict, nil)
	var saved creator.Character
	decodeResponse(t, apiRequest(h, http.MethodGet, "/characters/"+creationTestID, "", nil), http.StatusOK, &saved)
	if saved.DisplayName != "Тестовый волшебник" {
		t.Fatal("conflict modified existing character")
	}
}

func TestInvalidWholeFormCannotWrite(t *testing.T) {
	store, catalog := testDatabase(t)
	h := newHandler(catalog, store, nil)
	form := fixtureForm(t, catalog)
	form["attributes"] = json.RawMessage(`{"strength":4,"dexterity":4,"constitution":4,"wisdom":4,"intelligence":4,"charisma":4}`)
	w := apiRequest(h, http.MethodPost, "/characters", "", creationBodyBytes(t, catalog, form))
	var validation creator.Validation
	decodeResponse(t, w, http.StatusUnprocessableEntity, &validation)
	recordResponse(t, "creation-validation.json", w)
	if validation.Valid || len(validation.Issues) == 0 || characterCount(t, store) != 0 {
		t.Fatal("invalid form was saved")
	}
}

func TestWholeCreationRollsBackChildrenAndCanRetry(t *testing.T) {
	store, catalog := testDatabase(t)
	h := newHandler(catalog, store, nil)
	_, err := store.Pool.Exec(t.Context(), `
		CREATE FUNCTION reject_creation_item() RETURNS trigger LANGUAGE plpgsql AS $$
		BEGIN RAISE EXCEPTION 'test failure'; END $$;
		CREATE TRIGGER reject_creation_item BEFORE INSERT ON character_items
		FOR EACH ROW EXECUTE FUNCTION reject_creation_item();`)
	if err != nil {
		t.Fatal(err)
	}
	form := fixtureForm(t, catalog)
	form["equipment"] = json.RawMessage(`{"items":[{"id":"staff","name":"Посох","description":""}]}`)
	body := creationBodyBytes(t, catalog, form)
	decodeResponse(t, apiRequest(h, http.MethodPost, "/characters", "", body), http.StatusInternalServerError, nil)
	var children int
	if err := store.Pool.QueryRow(t.Context(), "SELECT count(*) FROM character_abilities").Scan(&children); err != nil {
		t.Fatal(err)
	}
	if characterCount(t, store) != 0 || children != 0 {
		t.Fatal("partial creation survived transaction rollback")
	}
	if _, err := store.Pool.Exec(t.Context(), "DROP TRIGGER reject_creation_item ON character_items"); err != nil {
		t.Fatal(err)
	}
	decodeResponse(t, apiRequest(h, http.MethodPost, "/characters", "", body), http.StatusCreated, nil)
}

func TestFreshListSeesCreationFromAnotherInstance(t *testing.T) {
	store, catalog := testDatabase(t)
	a := newHandler(catalog, store, nil)
	b := newHandler(catalog, store, nil)
	var list struct {
		Items []creator.Summary `json:"items"`
	}
	decodeResponse(t, apiRequest(a, http.MethodGet, "/characters?limit=21&offset=0", "", nil), http.StatusOK, &list)
	decodeResponse(t, apiRequest(b, http.MethodGet, "/characters", "", nil), http.StatusOK, &list)
	decodeResponse(t, apiRequest(b, http.MethodPost, "/characters", "", creationBodyBytes(t, catalog, fixtureForm(t, catalog))), http.StatusCreated, nil)
	decodeResponse(t, apiRequest(a, http.MethodGet, "/characters?limit=21&offset=0&fresh=true", "", nil), http.StatusOK, &list)
	if len(list.Items) != 1 || list.Items[0].ID != creationTestID {
		t.Fatal("fresh list returned another instance's old cache")
	}
	decodeResponse(t, apiRequest(b, http.MethodGet, "/characters", "", nil), http.StatusOK, &list)
	if len(list.Items) != 1 {
		t.Fatal("successful write failed to invalidate local list cache")
	}
}

func TestCancelledCreationCannotWrite(t *testing.T) {
	store, catalog := testDatabase(t)
	_, character := catalog.Validate(fixtureForm(t, catalog))
	character.ID = creationTestID
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if _, _, err := store.CreateCharacter(ctx, character); err == nil {
		t.Fatal("cancelled creation succeeded")
	}
	if characterCount(t, store) != 0 {
		t.Fatal("cancelled request left a character")
	}
}
