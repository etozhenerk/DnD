package creator

import (
	"encoding/json"
	"testing"
)

func testForm(classID, raceID string, stats map[string]int) map[string]json.RawMessage {
	values := map[string]any{
		"appearance": map[string]any{"displayName": "Новый герой"},
		"race":       map[string]any{"raceId": raceID},
		"class":      map[string]any{"classId": classID},
		"attributes": stats,
		"abilities":  map[string]any{"items": []any{}},
		"equipment":  map[string]any{"items": []any{}},
	}
	out := map[string]json.RawMessage{}
	for k, v := range values {
		b, _ := json.Marshal(v)
		out[k] = b
	}
	return out
}
func TestEveryApprovedClassPreset(t *testing.T) {
	c, err := Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	if len(c.Races) != 7 {
		t.Fatalf("playable races=%d", len(c.Races))
	}
	for _, cl := range c.Rules.ClassProfiles {
		v, ch := c.ValidateForRuleset(c.Rules.ID, testForm(cl.ID, c.Races[0].ID, cl.DefaultStats))
		if !v.Valid {
			t.Errorf("class %s issues: %+v", cl.ID, v.Issues)
			continue
		}
		if v.Derived.PointsSpent != 14 || ch.MaxHP != cl.BaseHP+2*cl.DefaultStats["constitution"] {
			t.Errorf("class %s derived=%+v", cl.ID, v.Derived)
		}
	}
}
func TestValidationRejectsOverspendAndNonPlayableRace(t *testing.T) {
	c, err := Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	stats := map[string]int{"strength": 4, "dexterity": 4, "constitution": 4, "wisdom": 0, "intelligence": 0, "charisma": 0}
	v, _ := c.ValidateForRuleset(c.Rules.ID, testForm("fighter", "gnomes", stats))
	if v.Valid || len(v.Issues) < 2 {
		t.Fatalf("validation=%+v", v)
	}
}
func TestValidationRejectsUnapprovedFormalEffects(t *testing.T) {
	c, err := Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	f := testForm("fighter", "humans", c.Rules.ClassProfiles[4].DefaultStats)
	f["abilities"] = json.RawMessage(`{"items":[{"id":"fire-bolt","name":"Искра","trigger":"action","effectText":"1d6 урона","effects":[{"type":"damage","amount":999}]}]}`)
	v, _ := c.ValidateForRuleset(c.Rules.ID, f)
	if v.Valid {
		t.Fatal("unapproved damage passed validation")
	}
	found := false
	for _, i := range v.Issues {
		if i.Code == "unapproved" {
			found = true
		}
	}
	if !found {
		t.Fatalf("issues=%+v", v.Issues)
	}
}
