package advisor

import (
	"encoding/json"
	"fmt"
	"strings"
)

type ideaAppearance struct {
	DisplayName string   `json:"displayName"`
	Pronouns    string   `json:"pronouns"`
	Appearance  string   `json:"appearance"`
	Story       string   `json:"story"`
	Motivation  string   `json:"motivation"`
	Personality []string `json:"personality"`
}

type ideaSkill struct {
	ID           string `json:"id,omitempty"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	ProfileID    string `json:"profileId"`
	ModifierStat string `json:"modifierStat"`
}

type ideaItem struct {
	ID          string `json:"id,omitempty"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type characterIdea struct {
	Appearance ideaAppearance `json:"appearance"`
	RaceID     string         `json:"raceId"`
	ClassID    string         `json:"classId"`
	Skills     []ideaSkill    `json:"skills"`
	Equipment  []ideaItem     `json:"equipment"`
}

func (p *Prompt) buildProposal(idea *characterIdea) *Proposal {
	if idea == nil || !boundedIdea(idea) {
		return nil
	}
	var attrs map[string]int
	for _, cl := range p.catalog.Rules.ClassProfiles {
		if cl.ID == idea.ClassID {
			attrs = cl.DefaultStats
			break
		}
	}
	if attrs == nil {
		return nil
	}
	stat := p.catalog.AbilityRules.ModifierStats[0]
	for _, s := range p.catalog.AbilityRules.ModifierStats {
		if attrs[s] > attrs[stat] {
			stat = s
		}
	}
	for i := range idea.Skills {
		idea.Skills[i].ID = fmt.Sprintf("advisor-skill-%d", i+1)
	}
	for i := range idea.Equipment {
		idea.Equipment[i].ID = fmt.Sprintf("advisor-item-%d", i+1)
	}
	if idea.Skills == nil {
		idea.Skills = []ideaSkill{}
	}
	if idea.Equipment == nil {
		idea.Equipment = []ideaItem{}
	}
	if idea.Appearance.Personality == nil {
		idea.Appearance.Personality = []string{}
	}
	source := map[string]any{
		"appearance": idea.Appearance, "race": map[string]string{"raceId": idea.RaceID},
		"class": map[string]string{"classId": idea.ClassID}, "attributes": attrs,
		"abilities": map[string]any{"basicAction": map[string]string{"name": "Базовая атака", "description": "", "modifierStat": stat}, "items": idea.Skills, "narrativeItems": []any{}},
		"equipment": map[string]any{"items": idea.Equipment},
	}
	form := map[string]json.RawMessage{}
	for key, value := range source {
		raw, err := json.Marshal(value)
		if err != nil {
			return nil
		}
		form[key] = raw
	}
	validation, _ := p.catalog.Validate(form)
	if !validation.Valid {
		return nil
	}
	return &Proposal{FormData: form}
}

func boundedIdea(idea *characterIdea) bool {
	a := idea.Appearance
	if !validText(a.DisplayName, 120) || len(a.Personality) > 5 || len(idea.Skills) > 3 || len(idea.Equipment) > 8 {
		return false
	}
	for _, s := range []string{a.Pronouns, a.Appearance, a.Story, a.Motivation} {
		if len([]rune(s)) > 1000 || strings.ContainsRune(s, 0) {
			return false
		}
	}
	for _, s := range a.Personality {
		if !validText(s, 120) {
			return false
		}
	}
	for _, skill := range idea.Skills {
		if !validText(skill.Name, 120) || len([]rune(skill.Description)) > 1000 || strings.ContainsRune(skill.Description, 0) {
			return false
		}
	}
	for _, item := range idea.Equipment {
		if !validText(item.Name, 120) || len([]rune(item.Description)) > 1000 || strings.ContainsRune(item.Description, 0) {
			return false
		}
	}
	return true
}
