package advisor

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestGuideCannotEnablePaidFeatures(t *testing.T) {
	guide, err := Load("../../../shared/advisor/guide.json")
	if err != nil {
		t.Fatal(err)
	}
	if guide.BudgetRub != 200 || !guide.Capabilities.StepHints || guide.Capabilities.Chat || guide.Capabilities.ProactiveComments || guide.Capabilities.FillCharacter || guide.Capabilities.Images {
		t.Fatalf("unexpected policy: budget=%d capabilities=%+v", guide.BudgetRub, guide.Capabilities)
	}
	data, err := json.Marshal(struct {
		Version string       `json:"version"`
		Steps   []Step       `json:"steps"`
		Paid    Capabilities `json:"capabilities"`
	}{guide.Version, guide.Steps, Capabilities{Chat: true}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := decodeGuide(data); err == nil {
		t.Fatal("text catalog enabled a paid feature")
	}
}

func TestIncompleteOrAmbiguousGuideIsRejected(t *testing.T) {
	guide, err := Load("../../../shared/advisor/guide.json")
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name   string
		change func([]Step) []Step
	}{
		{
			name: "missing step",
			change: func(steps []Step) []Step {
				return steps[:6]
			},
		},
		{
			name: "duplicate step",
			change: func(steps []Step) []Step {
				steps[1].ID = steps[0].ID
				return steps
			},
		},
		{
			name: "unknown step",
			change: func(steps []Step) []Step {
				steps[0].ID = "photo"
				return steps
			},
		},
		{
			name: "blank hint",
			change: func(steps []Step) []Step {
				steps[0].Text = "  "
				return steps
			},
		},
		{
			name: "oversized hint",
			change: func(steps []Step) []Step {
				steps[0].Text = strings.Repeat("я", 601)
				return steps
			},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			steps := append([]Step(nil), guide.Steps...)
			data, err := json.Marshal(struct {
				Version string `json:"version"`
				Steps   []Step `json:"steps"`
			}{guide.Version, tc.change(steps)})
			if err != nil {
				t.Fatal(err)
			}
			if _, err := decodeGuide(data); err == nil {
				t.Fatal("invalid guide accepted")
			}
		})
	}
}
