// Package advisor describes public guidance without invoking a paid AI provider.
package advisor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"unicode/utf8"
)

// BudgetRub is the agreed maximum for a future character creation session.
// Paid requests must remain disabled until durable accounting enforces it.
const BudgetRub = 200

// Step contains a free entry hint, not an AI response or form mutation.
type Step struct {
	ID          string `json:"id"`
	Intro       string `json:"intro"`
	Text        string `json:"text"`
	Placeholder string `json:"placeholder"`
}

// Capabilities explicitly distinguishes implemented hints from future AI features.
type Capabilities struct {
	StepHints         bool `json:"stepHints"`
	Chat              bool `json:"chat"`
	ProactiveComments bool `json:"proactiveComments"`
	FillCharacter     bool `json:"fillCharacter"`
	Images            bool `json:"images"`
}

// Guide is immutable public configuration shared with the creator UI.
type Guide struct {
	Version      string       `json:"version"`
	BudgetRub    int          `json:"budgetRub"`
	Capabilities Capabilities `json:"capabilities"`
	Steps        []Step       `json:"steps"`
}

// Load reads a bounded, strictly validated guide. Availability is set by code,
// so editing the text catalog cannot accidentally enable paid features.
func Load(path string) (*Guide, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open advisor guide: %w", err)
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, (16<<10)+1))
	if err != nil || len(data) > 16<<10 {
		return nil, fmt.Errorf("advisor guide cannot be read within size limit")
	}
	return decodeGuide(data)
}

func decodeGuide(data []byte) (*Guide, error) {
	var source struct {
		Version string `json:"version"`
		Steps   []Step `json:"steps"`
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&source); err != nil {
		return nil, fmt.Errorf("decode advisor guide: %w", err)
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return nil, fmt.Errorf("advisor guide must contain one JSON object")
	}
	if source.Version != "character-advisor-v1" {
		return nil, fmt.Errorf("unsupported advisor guide version")
	}
	order := []string{"appearance", "race", "class", "attributes", "abilities", "equipment", "review"}
	if len(source.Steps) != len(order) {
		return nil, fmt.Errorf("advisor guide must cover every creator step")
	}
	for i, step := range source.Steps {
		if step.ID != order[i] || !validText(step.Intro, 120) || !validText(step.Text, 600) || !validText(step.Placeholder, 160) {
			return nil, fmt.Errorf("invalid advisor guide step at position %d", i)
		}
	}
	return &Guide{
		Version: source.Version, BudgetRub: BudgetRub,
		Capabilities: Capabilities{StepHints: true}, Steps: source.Steps,
	}, nil
}

func validText(value string, maximum int) bool {
	return utf8.ValidString(value) && strings.TrimSpace(value) != "" && utf8.RuneCountInString(value) <= maximum
}
