package advisor

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestCommentsAndImagePromptsRemainBounded(t *testing.T) {
	p := proposalPrompt(t)
	in := Input{Mode: "portrait", Message: "Нужен зелёный плащ", Context: Context{RaceID: "elves", ClassID: "rogue", FormData: map[string]json.RawMessage{"appearance": json.RawMessage(`{"appearance":"` + strings.Repeat("длинная внешность ", 100) + `"}`)}}}
	prompt := p.ImagePrompt(in)
	if len([]rune(prompt)) > 500 || !strings.Contains(prompt, "зелёный плащ") || !strings.Contains(prompt, "Эльфы") {
		t.Fatalf("bad image prompt=%s", prompt)
	}
	comment := ShortComment("### " + strings.Repeat("Репейник на плаще! ", 100))
	if len([]rune(comment)) > 160 || strings.Contains(comment, "###") || ShortComment("***") == "" {
		t.Fatal("invalid bubble comment")
	}
	cost, err := Cost(Completion{ImageCharge: true})
	if err != nil || cost != ImagePrice || ReservationFor("icon") != ImagePrice {
		t.Fatal("image price outside shared envelope")
	}
	if _, err := Cost(Completion{ImageCharge: true, InputTokens: 100}); err == nil {
		t.Fatal("image accepted text usage")
	}
}

func TestSuggestionsAndValidManualStatsSurviveNormalization(t *testing.T) {
	p := proposalPrompt(t)
	stored := p.PrepareSuggestion(proposalInput(), "name")
	turn := Turn{Reply: stored}
	p.DecodeTurn(&turn)
	if turn.Proposal == nil || turn.Proposal.Target != "name" {
		t.Fatal("suggestion lost its scope")
	}
	manual := json.RawMessage(`{"strength":-1,"dexterity":3,"constitution":2,"wisdom":2,"intelligence":2,"charisma":0}`)
	preserved := Turn{Reply: p.PreserveAttributes(stored, map[string]json.RawMessage{"class": turn.Proposal.FormData["class"], "attributes": manual})}
	p.DecodeTurn(&preserved)
	if preserved.Proposal == nil || string(preserved.Proposal.FormData["attributes"]) != string(manual) {
		t.Fatal("valid manual point allocation lost")
	}
	snapshot := turn.Proposal.FormData
	// An invalid manual allocation must not reach an otherwise valid proposal.
	snapshot = map[string]json.RawMessage{"class": snapshot["class"], "attributes": json.RawMessage(`{"strength":999}`)}
	safe := Turn{Reply: p.PreserveAttributes(stored, snapshot)}
	p.DecodeTurn(&safe)
	if safe.Proposal == nil {
		t.Fatal("invalid snapshot destroyed approved class defaults")
	}
}

func TestPromptKeepsPlayerMessageWhenOptionalContextIsLong(t *testing.T) {
	p, err := LoadPrompt("../../../shared/advisor/persona.md", "../../../content/world-map.json", proposalPrompt(t).catalog)
	if err != nil {
		t.Fatal(err)
	}
	in := Input{Mode: "suggest", Target: "appearance", Message: strings.Repeat("История героя. ", 100), Context: Context{
		StepID: "appearance", RaceID: "elves", ClassID: "rogue",
		Concept:  strings.Repeat("Подробная предыстория. ", 80),
		FormData: map[string]json.RawMessage{"appearance": json.RawMessage(`{"backstory":"` + strings.Repeat("Легенда. ", 700) + `"}`)},
	}}
	if err := in.Validate(); err != nil {
		t.Fatal(err)
	}
	messages, err := p.Messages(nil, in)
	if err != nil || messages[len(messages)-1].Content != in.Message {
		t.Fatalf("legal message was lost: %v", err)
	}
	size := 0
	for _, message := range messages {
		size += len(message.Content)
	}
	if size > MaxPromptBytes || len(in.Context.FormData["appearance"]) == 0 {
		t.Fatal("prompt envelope exceeded or original snapshot changed")
	}
}
