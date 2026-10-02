package advisor

import (
	"encoding/json"
	"strings"
	"testing"
	"unicode/utf8"
)

func TestImageWriterPreservesWishTargetAndBoundedContext(t *testing.T) {
	p := proposalPrompt(t)
	in := Input{Mode: "icon", Target: "spark", Message: strings.Repeat("🔥", 2000), Context: Context{
		StepID: "abilities", Name: "Тарен", RaceID: "elves", ClassID: "rogue",
		FormData: map[string]json.RawMessage{"abilities": json.RawMessage(`{"items":[{"id":"spark","name":"Искра","description":"Огонёк"}]}`),
			"appearance": json.RawMessage(`{"appearance":"` + strings.Repeat("волосы ", 1000) + `"}`)},
	}}
	messages, err := p.ImagePromptMessages(in)
	if err != nil || len(messages) != 2 {
		t.Fatalf("writer messages: %v", err)
	}
	var brief struct{ Wish, Target, Style, VisualSummary string }
	if json.Unmarshal([]byte(messages[1].Content), &brief) != nil || brief.Wish != in.Message || brief.Target != "spark" || !strings.Contains(brief.VisualSummary, "Искра") {
		t.Fatal("writer lost original wish or selected skill")
	}
	if len(messages[0].Content)+len(messages[1].Content) > ImagePromptMaxBytes || !strings.Contains(messages[0].Content, "500") {
		t.Fatal("writer request exceeded envelope or lacks image API requirements")
	}
}

func TestCompiledImagePromptKeepsCompositionAndNeverExceeds500Characters(t *testing.T) {
	for _, kind := range []string{"portrait", "icon"} {
		parts, err := json.Marshal(map[string]string{"subject": strings.Repeat("Эльф 🧝", 100), "details": strings.Repeat("Зелёный плащ ", 100), "scene": strings.Repeat("Туманный лес ", 100)})
		if err != nil {
			t.Fatal(err)
		}
		prompt, err := CompileImagePrompt(string(parts), kind)
		if err != nil || !utf8.ValidString(prompt) || utf8.RuneCountInString(prompt) > 500 {
			t.Fatalf("kind=%s size=%d err=%v", kind, utf8.RuneCountInString(prompt), err)
		}
		for _, detail := range []string{"Не мультфильм", "Эльф", "Зелёный плащ", "Туманный лес"} {
			if !strings.Contains(prompt, detail) {
				t.Fatalf("%s lost %q", kind, detail)
			}
		}
		if (kind == "portrait") != strings.Contains(prompt, "полный рост") {
			t.Fatal("portrait and icon framing mixed")
		}
	}
	for _, raw := range []string{`{}`, `{"subject":""}`, `{"subject":"Герой","extra":true}`, `{"subject":5}`, `{"subject":"Герой"} {}`, `{"subject":"Герой\u0000"}`} {
		if _, err := CompileImagePrompt(raw, "portrait"); err == nil {
			t.Fatalf("invalid writer output accepted: %s", raw)
		}
	}
}

func TestImagePipelinePricesIncludeOnlyCompletedStages(t *testing.T) {
	writer := Completion{ImagePrompt: true, InputTokens: 1000, OutputTokens: 100}
	cost, err := Cost(writer)
	if err != nil || cost != 350000 {
		t.Fatalf("writer cost=%d err=%v", cost, err)
	}
	writer.ImageCharge = true
	cost, err = Cost(writer)
	if err != nil || cost != 350000+ImagePrice || cost > ReservationFor("portrait") {
		t.Fatalf("pipeline cost=%d err=%v", cost, err)
	}
	writer.InputTokens, writer.OutputTokens = ImagePromptMaxBytes*3+1024, ImagePromptMaxOutputTokens
	cost, err = Cost(writer)
	if err != nil || cost != ReservationFor("icon") {
		t.Fatal("reservation does not cover both stages")
	}
	writer.OutputTokens++
	if _, err := Cost(writer); err == nil {
		t.Fatal("writer usage outside envelope accepted")
	}
}
