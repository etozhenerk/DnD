package abilities

import (
	"encoding/json"
	"strings"
	"testing"
)

func testRules(t *testing.T) Rules {
	t.Helper()
	r, err := Load("../../../content/character-abilities.json", "character-creation-v1", 1)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func completeSection() Section {
	text := ""
	return Section{BasicAction: &BasicInput{Name: "Удар", Description: &text, ModifierStat: "strength"}, Items: []Input{}, NarrativeItems: []NarrativeInput{}}
}

func active(id, profile, stat string) Input {
	text := "Ледяная искра без дополнительных эффектов"
	return Input{ID: id, Name: "Искра", Description: &text, ProfileID: profile, ModifierStat: stat}
}

func encodeSection(t *testing.T, s Section) json.RawMessage {
	t.Helper()
	raw, err := json.Marshal(s)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

func TestApprovedProfilesNormalizeFromActualStats(t *testing.T) {
	r := testRules(t)
	for _, p := range r.Profiles {
		t.Run(p.ID, func(t *testing.T) {
			s := completeSection()
			s.Items = []Input{active("custom-skill", p.ID, "wisdom")}
			v := r.Validate(encodeSection(t, s), map[string]int{"strength": 3, "wisdom": -3})
			if !v.Valid || v.PointsSpent != p.Points || len(v.Abilities) != 2 {
				t.Fatalf("result=%+v", v)
			}
			a := v.Abilities[1]
			e := a.Effects[0]
			if a.ProfileID != p.ID || e.ProfileID != p.ID || e.RulesetID != r.ID || e.Dice != p.Dice || a.Uses.Max != p.Uses.Max || a.Uses.Scope != "battle" {
				t.Fatalf("normalized=%+v", a)
			}
			if p.Kind == "healing" {
				if e.Modifier != 0 || e.AttackBonus != nil || !strings.Contains(a.EffectText, "активном бою") {
					t.Fatalf("negative healing modifier=%+v", e)
				}
			} else if e.Modifier != -3 || e.AttackBonus == nil || *e.AttackBonus != -1 {
				t.Fatalf("negative damage modifier=%+v", e)
			}
		})
	}
}

func TestBasicAttackAndUnspentBudgetAreAllowed(t *testing.T) {
	r := testRules(t)
	v := r.Validate(encodeSection(t, completeSection()), map[string]int{"strength": 4})
	if !v.Valid || v.PointsSpent != 0 || v.PointsBudget != 6 || len(v.Abilities) != 1 {
		t.Fatalf("result=%+v", v)
	}
	a := v.Abilities[0]
	if a.ID != "basic-attack" || a.Uses != nil || a.Effects[0].Dice != (Dice{Count: 1, Sides: 6}) || *a.Effects[0].AttackBonus != 6 {
		t.Fatalf("basic=%+v", a)
	}
}

func TestValidationLimits(t *testing.T) {
	r := testRules(t)
	cases := []struct {
		name   string
		change func(*Section)
		code   string
	}{
		{"budget", func(s *Section) {
			s.Items = []Input{active("heal-a", "healing-2d8-once", "wisdom"), active("heal-b", "healing-d8-twice", "wisdom")}
		}, "budget"},
		{"duplicate profile", func(s *Section) {
			s.Items = []Input{active("a", "damage-d8-twice", "wisdom"), active("b", "damage-d8-twice", "wisdom")}
		}, "duplicate_profile"},
		{"reserved ID", func(s *Section) { s.Items = []Input{active("basic-attack", "damage-d8-twice", "wisdom")} }, "duplicate_id"},
		{"cross-list ID", func(s *Section) {
			s.Items = []Input{active("shared-id", "damage-d8-twice", "wisdom")}
			s.NarrativeItems = []NarrativeInput{{ID: "shared-id", Name: "Знахарь", Description: "Знает травы"}}
		}, "duplicate_id"},
		{"four active", func(s *Section) {
			for i, p := range r.Profiles[:4] {
				s.Items = append(s.Items, active(strings.Repeat("a", i+1), p.ID, "wisdom"))
			}
		}, "too_many"},
		{"four narrative", func(s *Section) {
			for i := range 4 {
				s.NarrativeItems = append(s.NarrativeItems, NarrativeInput{ID: strings.Repeat("a", i+1), Name: "Особенность", Description: "История"})
			}
		}, "too_many"},
		{"unknown profile", func(s *Section) { s.Items = []Input{active("a", "infinite-healing", "wisdom")} }, "unknown_profile"},
		{"constitution", func(s *Section) { s.BasicAction.ModifierStat = "constitution" }, "unknown_stat"},
		{"missing stat", func(s *Section) { s.BasicAction.ModifierStat = "intelligence" }, "unknown_stat"},
		{"missing base", func(s *Section) { s.BasicAction = nil }, "invalid"},
		{"blank name", func(s *Section) { s.BasicAction.Name = "  " }, "required"},
		{"long name", func(s *Section) { s.BasicAction.Name = strings.Repeat("я", 121) }, "too_long"},
		{"long text", func(s *Section) { text := strings.Repeat("я", 2001); s.BasicAction.Description = &text }, "too_long"},
		{"icon unavailable", func(s *Section) {
			x := active("a", "damage-d8-twice", "wisdom")
			icon := "00000000-0000-0000-0000-000000000001"
			x.IconAssetID = &icon
			s.Items = []Input{x}
		}, "asset_unavailable"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			s := completeSection()
			tc.change(&s)
			v := r.Validate(encodeSection(t, s), map[string]int{"strength": 3, "wisdom": 1, "constitution": 2})
			found := false
			for _, issue := range v.Issues {
				found = found || issue.Code == tc.code
			}
			if v.Valid || !found || len(v.Abilities) != 0 {
				t.Fatalf("want %s, got %+v", tc.code, v)
			}
		})
	}
}

func TestDecodeRejectsClientMechanicsAndNulls(t *testing.T) {
	for _, raw := range []string{
		`{"points":0}`, `{"items":[{"effects":[{"type":"healing","amount":999}]}]}`,
		`{"items":[{"uses":null}]}`, `{"items":[{"dice":{"count":100}}]}`,
		`{"basicAction":{"effectText":"999 урона"}}`, `{"items":[{"trigger":"free"}]}`,
		`{"narrativeItems":[{"modifierStat":"wisdom"}]}`, `{"basicAction":null}`,
		`{"items":null}`, `{"items":[null]}`, `{"items":[{"name":null}]}`,
		`{"basicAction":{"description":null}}`, `{"items":{}}`, `{} {}`, `null`,
	} {
		t.Run(raw, func(t *testing.T) {
			if _, err := Decode(json.RawMessage(raw)); err == nil {
				t.Fatalf("unsafe input accepted: %s", raw)
			}
		})
	}
}

func TestPartialSectionSavesButCannotComplete(t *testing.T) {
	r := testRules(t)
	raw := json.RawMessage(`{"basicAction":{"name":"Начало"}}`)
	if _, err := Decode(raw); err != nil {
		t.Fatal(err)
	}
	if v := r.Validate(raw, map[string]int{}); v.Valid {
		t.Fatal("partial section passed full validation")
	}
}
