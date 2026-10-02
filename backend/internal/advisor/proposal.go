package advisor

import (
	"bytes"
	"encoding/json"
	"io"
	"regexp"
	"strings"
)

const proposalPrefix = "advisor-proposal-v1:"

// Proposal is a server-validated complete form for the player's review, not a write.
type Proposal struct {
	FormData map[string]json.RawMessage `json:"formData"`
	Target   string                     `json:"target,omitempty"`
}

// PrepareSuggestion retains a complete validated idea but scopes the player's application.
func (p *Prompt) PrepareSuggestion(raw, target string) string {
	result := p.PrepareProposal(raw)
	if !strings.HasPrefix(result, proposalPrefix) {
		return result
	}
	var stored storedProposal
	if json.Unmarshal([]byte(strings.TrimPrefix(result, proposalPrefix)), &stored) != nil || stored.Proposal == nil {
		return result
	}
	stored.Proposal.Target = target
	data, err := json.Marshal(stored)
	if err != nil {
		return result
	}
	return proposalPrefix + string(data)
}

type proposalAnswer struct {
	Reply     string         `json:"reply"`
	Character *characterIdea `json:"character"`
}

type storedProposal struct {
	Reply    string    `json:"reply"`
	Proposal *Proposal `json:"proposal,omitempty"`
}

// PrepareProposal accounts even malformed model output, but never exposes raw JSON
// or accepts it as a form. A failed proposal does not trigger another paid call.
func (p *Prompt) PrepareProposal(raw string) string {
	var answer proposalAnswer
	decoder := json.NewDecoder(strings.NewReader(raw))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&answer) != nil || decoder.Decode(new(any)) != io.EOF || !validText(answer.Reply, 1200) {
		return "Перо убежало впереди мысли. Давай уточним задумку — и попробуем собрать героя ещё раз."
	}
	proposal := p.buildProposal(answer.Character)
	reply := cleanReply(answer.Reply)
	if proposal == nil {
		return reply + " Не удалось собрать сбалансированный набор. Уточни расу и класс — попробуем ещё раз."
	}
	data, err := json.Marshal(storedProposal{Reply: reply, Proposal: proposal})
	if err != nil || len(data) > 15000 {
		return "Набросок вышел слишком большим. Давай соберём героя попроще."
	}
	return proposalPrefix + string(data)
}

// DecodeTurn preserves old plain-text history. Only our tagged, validated envelope
// can become a proposal; user text and provider JSON cannot masquerade as one.
func (p *Prompt) DecodeTurn(turn *Turn) {
	if !strings.HasPrefix(turn.Reply, proposalPrefix) {
		turn.Reply = cleanReply(turn.Reply)
		return
	}
	var stored storedProposal
	decoder := json.NewDecoder(bytes.NewBufferString(strings.TrimPrefix(turn.Reply, proposalPrefix)))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&stored) != nil || decoder.Decode(new(any)) != io.EOF || stored.Proposal == nil {
		turn.Reply = "Не получилось прочитать набросок героя."
		return
	}
	validation, _ := p.catalog.Validate(stored.Proposal.FormData)
	turn.Reply = cleanReply(stored.Reply)
	if validation.Valid && (stored.Proposal.Target == "" || validTarget("suggest", stored.Proposal.Target)) {
		turn.Proposal = stored.Proposal
	}
}

var advisorName = regexp.MustCompile(`(?i)(^|[^А-Яа-яЁёA-Za-z])(сова-советник|сова|совой|сове|совы|сову)($|[^А-Яа-яЁёA-Za-z])`)

func cleanReply(text string) string {
	names := map[string]string{"сова-советник": "Советник", "сова": "Советник", "совой": "советником", "сове": "советнику", "совы": "советника", "сову": "советника"}
	return advisorName.ReplaceAllStringFunc(text, func(word string) string {
		match := advisorName.FindStringSubmatch(word)
		return match[1] + names[strings.ToLower(match[2])] + match[3]
	})
}
