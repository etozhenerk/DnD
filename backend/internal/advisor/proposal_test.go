package advisor

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

func proposalPrompt(t *testing.T) *Prompt {
	t.Helper()
	c, err := creator.Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	return &Prompt{catalog: c}
}

func proposalInput() string {
	return `{"reply":"Ловкий герой с сомнительной репутацией — беру перо!","character":{"appearance":{"displayName":"Алес","pronouns":"он","appearance":"Плащ с репейником","story":"Странствует по восьми землям.","motivation":"Вернуть долг","personality":["Любопытный"]},"raceId":"elves","classId":"rogue","skills":[{"name":"Подлый выпад","description":"Одиночный удар из тени.","profileId":"damage-d8-twice","modifierStat":"dexterity"}],"equipment":[{"name":"Плащ","description":"Слишком много карманов."}]}}`
}

func TestProposalUsesApprovedStatsAndSurvivesHistory(t *testing.T) {
	p := proposalPrompt(t)
	stored := p.PrepareProposal(proposalInput())
	turn := Turn{Reply: stored, Status: "succeeded"}
	p.DecodeTurn(&turn)
	if turn.Proposal == nil || strings.Contains(turn.Reply, "character") {
		t.Fatalf("missing safe proposal: %s", turn.Reply)
	}
	v, ch := p.catalog.Validate(turn.Proposal.FormData)
	if !v.Valid || ch.ClassID != "rogue" || ch.MaxHP == 0 {
		t.Fatalf("invalid normalized proposal: %+v", v)
	}
	for _, cl := range p.catalog.Rules.ClassProfiles {
		if cl.ID != "rogue" {
			continue
		}
		for key, n := range cl.DefaultStats {
			if ch.Attributes[key] != n {
				t.Fatalf("%s=%d want approved %d", key, ch.Attributes[key], n)
			}
		}
	}
	if !strings.Contains(stored, "advisor-skill-1") {
		t.Fatal("server must supply stable skill identifiers")
	}
}

func TestProposalRejectsInventedMechanicsWithoutRetry(t *testing.T) {
	p := proposalPrompt(t)
	for _, raw := range []string{
		strings.Replace(proposalInput(), "damage-d8-twice", "unlimited-healing", 1),
		strings.Replace(proposalInput(), `"classId":"rogue"`, `"classId":"god"`, 1),
		strings.Replace(proposalInput(), `"raceId":"elves"`, `"raceId":"invented"`, 1),
		strings.Replace(proposalInput(), `"classId":"rogue"`, `"classId":"rogue","hp":999`, 1),
		proposalInput() + `{}`, `{"reply":"bad"}`, `{"reply":"x","character":null}`, "broken",
	} {
		turn := Turn{Reply: p.PrepareProposal(raw)}
		p.DecodeTurn(&turn)
		if turn.Proposal != nil || strings.Contains(turn.Reply, `"character"`) {
			t.Fatalf("unsafe proposal: %s", raw)
		}
	}
	old := Turn{Reply: "Обычный совет"}
	p.DecodeTurn(&old)
	if old.Reply != "Обычный совет" || old.Proposal != nil {
		t.Fatal("old conversation changed")
	}
}

func TestChronicleProjectionContainsOnlyPublishedRetrospective(t *testing.T) {
	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, "campaigns"), 0700); err != nil {
		t.Fatal(err)
	}
	source := `{"id":"public","title":"Летопись","status":"completed","masterSecret":"hidden","ending":{"secret":"hidden"},"completedChronicle":{"completedSummary":"Публичный путь","finalResult":"Победа","story":["Публичный эпизод"],"secret":"hidden"}}`
	for _, name := range []string{"nor-il-skald.json", "linda-small.json", "penisuela-chronicle.json"} {
		if err := os.WriteFile(filepath.Join(dir, "campaigns", name), []byte(source), 0600); err != nil {
			t.Fatal(err)
		}
	}
	text, err := loadCompletedChronicles(dir)
	if err != nil || !strings.Contains(text, "Публичный эпизод") || strings.Contains(text, "hidden") {
		t.Fatalf("unsafe chronicle: %s err=%v", text, err)
	}
	var projected []publicChronicle
	if json.Unmarshal([]byte(text), &projected) != nil || len(projected) != 3 {
		t.Fatal("wrong public chronicles")
	}
}
