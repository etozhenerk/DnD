package main

import (
	"net/http"
	"reflect"
	"strings"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

func TestCharacterSkillsHTTPDatabaseRoundTrip(t *testing.T) {
	store, c := testDatabase(t)
	h := newHandler(c, store, nil)
	d := filledDraft(t, h, c)
	var v creator.Validation
	w := apiRequest(h, http.MethodPost, "/drafts/"+d.ID+"/validate", d.Token, nil)
	decodeResponse(t, w, http.StatusOK, &v)
	recordResponse(t, "validation.json", w)
	if !v.Valid || v.Skills == nil || v.Skills.PointsSpent != 6 || v.Skills.PointsBudget != 6 {
		t.Fatalf("validation=%+v", v)
	}
	decodeResponse(t, apiRequest(h, http.MethodGet, "/drafts/"+d.ID, strings.Repeat("x", 43), nil), http.StatusNotFound, nil)
	var created, read creator.Character
	decodeResponse(t, apiRequest(h, http.MethodPost, "/drafts/"+d.ID+"/complete", d.Token, nil), http.StatusCreated, &created)
	w = apiRequest(h, http.MethodGet, "/characters/"+created.ID, "", nil)
	decodeResponse(t, w, http.StatusOK, &read)
	recordResponse(t, "character.json", w)
	if !reflect.DeepEqual(created.Abilities, read.Abilities) || created.RulesetID != read.RulesetID || read.RulesetID != "character-creation-v2" {
		t.Fatalf("round trip differs: created=%+v read=%+v", created.Abilities, read.Abilities)
	}
	if len(read.Abilities) != 5 || read.Abilities[0].Uses != nil || read.Abilities[3].Effects[0].Modifier != 0 || read.Abilities[4].AutomationMode != "manual" || len(read.Abilities[4].Effects) != 0 {
		t.Fatalf("read abilities=%+v", read.Abilities)
	}
	decodeResponse(t, apiRequest(h, http.MethodGet, "/drafts/"+d.ID, d.Token, nil), http.StatusNotFound, nil)
	decodeResponse(t, apiRequest(h, http.MethodPost, "/drafts/"+d.ID+"/complete", d.Token, nil), http.StatusNotFound, nil)
	var creatorID *string
	if err := store.Pool.QueryRow(t.Context(), "SELECT creator_user_id::text FROM characters WHERE id=$1", read.ID).Scan(&creatorID); err != nil || creatorID != nil {
		t.Fatalf("anonymous creator=%v error=%v", creatorID, err)
	}
}

func TestPartialSkillsAndRejectedMechanicsLeaveDraftIntact(t *testing.T) {
	store, c := testDatabase(t)
	h := newHandler(c, store, nil)
	d := filledDraft(t, h, c)
	bad := []byte(`{"section":"abilities","value":{"items":[{"effects":[{"type":"healing","amount":999}]}]}}`)
	decodeResponse(t, apiRequest(h, http.MethodPatch, "/drafts/"+d.ID, d.Token, bad), http.StatusBadRequest, nil)
	partial := []byte(`{"section":"abilities","value":{"basicAction":{"name":"Начало"}}}`)
	decodeResponse(t, apiRequest(h, http.MethodPatch, "/drafts/"+d.ID, d.Token, partial), http.StatusOK, nil)
	var v creator.Validation
	decodeResponse(t, apiRequest(h, http.MethodPost, "/drafts/"+d.ID+"/complete", d.Token, nil), http.StatusUnprocessableEntity, &v)
	if v.Valid || v.Skills == nil || v.Skills.Valid || characterCount(t, store) != 0 {
		t.Fatalf("partial draft completed: %+v", v)
	}
	decodeResponse(t, apiRequest(h, http.MethodGet, "/drafts/"+d.ID, d.Token, nil), http.StatusOK, nil)
}

func TestConcurrentCompletionCreatesOneCharacter(t *testing.T) {
	store, c := testDatabase(t)
	h := newHandler(c, store, nil)
	d := filledDraft(t, h, c)
	results := make(chan int, 2)
	for range 2 {
		go func() {
			results <- apiRequest(h, http.MethodPost, "/drafts/"+d.ID+"/complete", d.Token, nil).Code
		}()
	}
	counts := map[int]int{}
	for range 2 {
		counts[<-results]++
	}
	if counts[http.StatusCreated] != 1 || counts[http.StatusNotFound] != 1 || characterCount(t, store) != 1 {
		t.Fatalf("completion statuses=%v", counts)
	}
}

func TestOverspentSkillsCannotBeCompleted(t *testing.T) {
	store, c := testDatabase(t)
	h := newHandler(c, store, nil)
	d := filledDraft(t, h, c)
	bad := []byte(`{"section":"abilities","value":{
		"basicAction":{"name":"Посох","description":"","modifierStat":"intelligence"},
		"items":[
			{"id":"heal-a","name":"Лечение","description":"","profileId":"healing-2d8-once","modifierStat":"wisdom"},
			{"id":"heal-b","name":"Забота","description":"","profileId":"healing-d8-twice","modifierStat":"wisdom"}
		],"narrativeItems":[]}}`)
	decodeResponse(t, apiRequest(h, http.MethodPatch, "/drafts/"+d.ID, d.Token, bad), http.StatusOK, nil)
	var v creator.Validation
	decodeResponse(t, apiRequest(h, http.MethodPost, "/drafts/"+d.ID+"/complete", d.Token, nil), http.StatusUnprocessableEntity, &v)
	if v.Valid || v.Skills == nil || v.Skills.PointsSpent != 7 || characterCount(t, store) != 0 {
		t.Fatalf("overspent character completed: %+v", v)
	}
	decodeResponse(t, apiRequest(h, http.MethodGet, "/drafts/"+d.ID, d.Token, nil), http.StatusOK, nil)
}

func TestAbilityWriteFailureRollsBackWholeCompletion(t *testing.T) {
	store, c := testDatabase(t)
	h := newHandler(c, store, nil)
	d := filledDraft(t, h, c)
	_, err := store.Pool.Exec(t.Context(), `
		CREATE FUNCTION reject_test_ability() RETURNS trigger LANGUAGE plpgsql AS $$
		BEGIN
			IF NEW.ability_id = 'care' THEN RAISE EXCEPTION 'test write failure'; END IF;
			RETURN NEW;
		END $$;
		CREATE TRIGGER reject_test_ability BEFORE INSERT ON character_abilities
		FOR EACH ROW EXECUTE FUNCTION reject_test_ability();`)
	if err != nil {
		t.Fatal(err)
	}
	decodeResponse(t, apiRequest(h, http.MethodPost, "/drafts/"+d.ID+"/complete", d.Token, nil), http.StatusInternalServerError, nil)
	var abilities int
	if err := store.Pool.QueryRow(t.Context(), "SELECT count(*) FROM character_abilities").Scan(&abilities); err != nil {
		t.Fatal(err)
	}
	if characterCount(t, store) != 0 || abilities != 0 {
		t.Fatalf("partial completion survived rollback: abilities=%d", abilities)
	}
	decodeResponse(t, apiRequest(h, http.MethodGet, "/drafts/"+d.ID, d.Token, nil), http.StatusOK, nil)
}

func TestOldDraftCompletesWithoutReinterpretingSkills(t *testing.T) {
	store, c := testDatabase(t)
	h := newHandler(c, store, nil)
	old, token, err := store.CreateDraft(t.Context(), "character-creation-v1")
	if err != nil {
		t.Fatal(err)
	}
	d := draftCredentials{ID: old.ID, Token: token}
	form := fixtureForm(t, c)
	form["abilities"] = []byte(`{"items":[{"id":"old-skill","name":"Знахарь","description":"Знает травы","trigger":"по решению мастера","effectText":"Помогает узнать растения"}]}`)
	saveForm(t, h, d, form)
	var ch, read creator.Character
	decodeResponse(t, apiRequest(h, http.MethodPost, "/drafts/"+d.ID+"/complete", d.Token, nil), http.StatusCreated, &ch)
	w := apiRequest(h, http.MethodGet, "/characters/"+ch.ID, "", nil)
	decodeResponse(t, w, http.StatusOK, &read)
	recordResponse(t, "legacy-character.json", w)
	if ch.RulesetID != "character-creation-v1" || len(read.Abilities) != 1 || read.Abilities[0].AutomationMode != "manual" || read.Abilities[0].ProfileID != "" || len(read.Abilities[0].Effects) != 0 {
		t.Fatalf("legacy read=%+v", read)
	}
}
