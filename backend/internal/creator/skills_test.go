package creator

import (
	"encoding/json"
	"testing"
)

func TestAllClassPresetsWithCurrentSkills(t *testing.T) {
	c, err := Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	for _, cl := range c.Rules.ClassProfiles {
		t.Run(cl.ID, func(t *testing.T) {
			form := testForm(cl.ID, "humans", cl.DefaultStats)
			form["abilities"] = json.RawMessage(`{"basicAction":{"name":"Атака","description":"","modifierStat":"strength"},"items":[],"narrativeItems":[]}`)
			v, ch := c.Validate(form)
			if !v.Valid || ch.RulesetID != "character-creation-v3" || v.Skills == nil || v.Skills.PointsSpent != 0 || v.Derived.PointsSpent != 14 || ch.MaxHP != cl.BaseHP+2*cl.DefaultStats["constitution"] {
				t.Fatalf("validation=%+v character=%+v", v, ch)
			}
		})
	}
}

func TestUnknownRulesetAndOldDraftCompatibility(t *testing.T) {
	c, err := Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	form := testForm("fighter", "humans", c.classes["fighter"].DefaultStats)
	form["abilities"] = json.RawMessage(`{"items":[{"id":"old-skill","name":"Знание","trigger":"по решению мастера","effectText":"Знает местные легенды"}]}`)
	old, ch := c.ValidateForRuleset("character-creation-v1", form)
	if !old.Valid || old.Skills != nil || ch.RulesetID != "character-creation-v1" || ch.Abilities[0].AutomationMode != "manual" {
		t.Fatalf("old draft=%+v character=%+v", old, ch)
	}
	if v, _ := c.ValidateForRuleset("unknown-rules", form); v.Valid || v.Issues[0].Code != "obsolete" {
		t.Fatalf("unknown ruleset=%+v", v)
	}
	if v, _ := c.Validate(form); v.Valid {
		t.Fatal("old descriptive skills must not be silently accepted as v2")
	}
}
