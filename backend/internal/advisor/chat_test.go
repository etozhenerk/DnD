package advisor

import (
	"errors"
	"os"
	"strings"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

func TestInputLimitsAndAccess(t *testing.T) {
	token, hash, err := NewToken()
	if err != nil || len(hash) != 32 || !ValidAccess("00000000-0000-0000-0000-000000000001", token) {
		t.Fatal("invalid capability")
	}
	base := Input{RequestID: "00000000-0000-0000-0000-000000000002", Message: "Привет", Context: Context{StepID: "appearance"}}
	for _, tc := range []struct {
		name   string
		change func(*Input)
	}{
		{"blank", func(in *Input) { in.Message = "  " }},
		{"long", func(in *Input) { in.Message = strings.Repeat("я", 2001) }},
		{"step", func(in *Input) { in.Context.StepID = "admin" }},
		{"id", func(in *Input) { in.RequestID = "guess" }},
		{"name", func(in *Input) { in.Context.Name = strings.Repeat("я", 121) }},
		{"nul", func(in *Input) { in.Context.Concept = "x\x00" }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			in := base
			tc.change(&in)
			if !errors.Is(in.Validate(), ErrInvalid) {
				t.Fatal("accepted invalid input")
			}
		})
	}
	if err := base.Validate(); err != nil {
		t.Fatal(err)
	}
	// Equal name/concept must not merge fields and lose the stricter name limit.
	base.Context.Name = strings.Repeat("я", 121)
	base.Context.Concept = base.Context.Name
	if base.Validate() == nil {
		t.Fatal("duplicate field values bypassed name limit")
	}
}

func TestPublishedPricesAndReservation(t *testing.T) {
	got, err := Cost(Completion{InputTokens: 1000, OutputTokens: 1000, CachedTokens: 400})
	if err != nil || got != 710000 {
		t.Fatalf("cost=%d err=%v want=710000", got, err)
	}
	maximum, err := Cost(Completion{InputTokens: MaxPromptBytes*3 + 1024, OutputTokens: MaxOutputTokens})
	if err != nil || maximum != Reservation() || maximum > SessionBudget {
		t.Fatal("reservation does not cover envelope")
	}
	for _, r := range []Completion{{InputTokens: 0}, {InputTokens: 2, CachedTokens: 3}, {InputTokens: 2, OutputTokens: MaxOutputTokens + 1}, {InputTokens: MaxPromptBytes*3 + 1025}} {
		if _, err := Cost(r); err == nil {
			t.Fatal("accepted usage outside envelope")
		}
	}
}

func TestPromptUsesApprovedCatalogAndRecentHistory(t *testing.T) {
	catalog, err := creator.Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	prompt, err := LoadPrompt("../../../shared/advisor/persona.md", "../../../content/world-map.json", catalog)
	if err != nil {
		t.Fatal(err)
	}
	in := Input{Message: "Подскажи имя", Context: Context{StepID: "appearance", ClassID: "fighter"}}
	history := []Turn{{Message: "старое", Reply: "первый ответ", Status: "succeeded"}, {Message: "таймаут", Status: "uncertain"}}
	messages, err := prompt.Messages(history, in)
	if err != nil {
		t.Fatal(err)
	}
	if messages[2].Content != "старое" || messages[3].Content != "первый ответ" || len(messages) != 5 {
		t.Fatalf("wrong history: %#v", messages)
	}
	if !strings.Contains(messages[0].Content, catalog.RulesetID) || !strings.Contains(messages[0].Content, "пернатый") {
		t.Fatal("missing rules or persona")
	}
	if strings.Contains(messages[0].Content, "defaultStats") || !strings.Contains(messages[0].Content, "baseStats") {
		t.Fatal("class projection must keep foundations without duplicate presets")
	}
	in.Context.RaceID = "invented-race"
	if _, err := prompt.Messages(nil, in); !errors.Is(err, ErrInvalid) {
		t.Fatal("accepted unknown race")
	}
	empty := t.TempDir() + "/empty.md"
	if err := os.WriteFile(empty, nil, 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := LoadPrompt(empty, "../../../content/world-map.json", catalog); err == nil {
		t.Fatal("accepted empty persona")
	}
}

func TestLoreProjectionExcludesMasterAndLayoutFields(t *testing.T) {
	file := t.TempDir() + "/map.json"
	data := []byte(`{"regions":[{"id":"north","name":"Север","description":"Публичная легенда","masterSecret":"hidden-master-secret","gameMasterCharacterId":"hidden-id","polygon":[[1,2]],"teaser":{"description":"Публичный анонс","secret":"hidden-teaser"}}]}`)
	if err := os.WriteFile(file, data, 0600); err != nil {
		t.Fatal(err)
	}
	lore, err := loadPublicLore(file)
	if err != nil || !strings.Contains(lore, "Публичная легенда") || strings.Contains(lore, "hidden") || strings.Contains(lore, "polygon") {
		t.Fatalf("unsafe projection: %s err=%v", lore, err)
	}
}
