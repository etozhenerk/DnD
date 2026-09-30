package creator

import (
	"encoding/json"
	"errors"

	"github.com/etozhenerk/DnD/backend/internal/abilities"
)

// CheckAbilitySection checks a partial section's structure before saving it.
// Semantic checks run at validation/completion using the draft's stored ruleset.
func (c *Catalog) CheckAbilitySection(rulesetID string, raw json.RawMessage) error {
	if rulesetID == c.Rules.ID {
		return nil
	}
	if rulesetID != c.RulesetID {
		return errors.New("unknown creation ruleset")
	}
	_, err := abilities.Decode(raw)
	return err
}
