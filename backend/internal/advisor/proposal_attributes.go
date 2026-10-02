package advisor

import (
	"encoding/json"
	"strings"
)

// PreserveAttributes retains the player's valid point allocation if the class stays the same.
func (p *Prompt) PreserveAttributes(reply string, snapshot map[string]json.RawMessage) string {
	if !strings.HasPrefix(reply, proposalPrefix) || len(snapshot["attributes"]) == 0 {
		return reply
	}
	var saved storedProposal
	if json.Unmarshal([]byte(strings.TrimPrefix(reply, proposalPrefix)), &saved) != nil || saved.Proposal == nil {
		return reply
	}
	var oldClass, newClass struct {
		ID string `json:"classId"`
	}
	if json.Unmarshal(snapshot["class"], &oldClass) != nil || json.Unmarshal(saved.Proposal.FormData["class"], &newClass) != nil || oldClass.ID != newClass.ID {
		return reply
	}
	previous := saved.Proposal.FormData["attributes"]
	saved.Proposal.FormData["attributes"] = snapshot["attributes"]
	validation, _ := p.catalog.Validate(saved.Proposal.FormData)
	if !validation.Valid {
		saved.Proposal.FormData["attributes"] = previous
		return reply
	}
	data, err := json.Marshal(saved)
	if err != nil {
		return reply
	}
	return proposalPrefix + string(data)
}
