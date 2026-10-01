package creator

import (
	"encoding/json"
	"testing"
)

func foundationForm(cl Class, stats map[string]int) map[string]json.RawMessage {
	form := testForm(cl.ID, "humans", stats)
	form["abilities"] = json.RawMessage(`{"basicAction":{"name":"Атака","description":"","modifierStat":"strength"},"items":[],"narrativeItems":[]}`)
	return form
}

func TestClassFoundationsNeedFourAdditionalPoints(t *testing.T) {
	c, err := Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	for _, cl := range c.Rules.ClassProfiles {
		t.Run(cl.ID, func(t *testing.T) {
			v, _ := c.Validate(foundationForm(cl, cl.BaseStats))
			if v.Valid || v.Derived == nil || v.Derived.PointsSpent != 10 || len(v.Issues) != 1 || v.Issues[0].Code != "budget" {
				t.Fatalf("unfinished foundation accepted or miscounted: %+v", v)
			}
			weaknesses := 0
			for _, value := range cl.BaseStats {
				if value < 0 {
					weaknesses++
				}
			}
			if weaknesses == 0 {
				t.Fatal("class foundation lost its weakness")
			}
			v, _ = c.Validate(foundationForm(cl, cl.DefaultStats))
			if !v.Valid || v.Derived.PointsSpent != 14 {
				t.Fatalf("recommended bonuses rejected: %+v", v)
			}
		})
	}
}

func TestClassFloorIsOnlyEnforcedForNewRuleset(t *testing.T) {
	c, err := Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	form := foundationForm(c.classes["fighter"], c.classes["wizard"].DefaultStats)
	v, _ := c.Validate(form)
	foundFloor := false
	for _, issue := range v.Issues {
		if issue.Path == "attributes.strength" && issue.Code == "class_floor" {
			foundFloor = true
		}
	}
	if v.Valid || !foundFloor {
		t.Fatalf("fighter specialization can be replaced: %+v", v)
	}
	legacy, character := c.ValidateForRuleset(c.AbilityRules.CharacterCreationRulesetID, form)
	if !legacy.Valid || legacy.Skills == nil || character.RulesetID != "character-creation-v2" {
		t.Fatalf("old flexible distribution reinterpreted: %+v", legacy)
	}
	if err := c.CheckAbilitySection(c.AbilityRules.CharacterCreationRulesetID, form["abilities"]); err != nil {
		t.Fatalf("old priced skills rejected: %v", err)
	}
}

func TestCatalogRejectsUnbalancedFoundation(t *testing.T) {
	c, err := Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	cl := c.classes["fighter"]
	cl.BaseStats = map[string]int{"strength": 4, "dexterity": 1, "constitution": 2, "wisdom": 1, "intelligence": -1, "charisma": 0}
	if err := c.checkClassFoundation(cl); err == nil {
		t.Fatal("unbalanced foundation accepted")
	}
	c.Rules.ClassFoundation.BonusBudget = 5
	if err := c.checkFoundations(); err == nil {
		t.Fatal("expanded class budget accepted")
	}
}
