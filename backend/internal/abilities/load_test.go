package abilities

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestLoadRejectsUnapprovedOrUnsupportedRules(t *testing.T) {
	cases := []struct {
		name   string
		change func(*Rules)
	}{
		{"draft", func(r *Rules) { r.Status = "draft" }},
		{"source version", func(r *Rules) { r.SourceRulesVersion = 2 }},
		{"source ID", func(r *Rules) { r.SourceCharacterCreationRulesetID = "different" }},
		{"same creation ID", func(r *Rules) { r.CharacterCreationRulesetID = "character-creation-v1" }},
		{"duplicate profile", func(r *Rules) { r.Profiles[1].ID = r.Profiles[0].ID }},
		{"unlimited profile", func(r *Rules) { r.Profiles[0].Uses = nil }},
		{"free numeric narrative", func(r *Rules) { r.NarrativeAbilities.FormalMechanicalBenefit = true }},
		{"multi target", func(r *Rules) { r.Resolution.MaximumTargets = 2 }},
		{"passive damage", func(r *Rules) { r.Resolution.ActionCost = 0 }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := testRules(t)
			tc.change(&r)
			data, err := json.Marshal(r)
			if err != nil {
				t.Fatal(err)
			}
			path := filepath.Join(t.TempDir(), "rules.json")
			if err := os.WriteFile(path, data, 0o600); err != nil {
				t.Fatal(err)
			}
			if _, err := Load(path, "character-creation-v1", 1); err == nil {
				t.Fatal("unsupported rules accepted")
			}
		})
	}
}
