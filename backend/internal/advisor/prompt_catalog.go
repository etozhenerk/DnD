package advisor

import (
	"encoding/json"

	"github.com/etozhenerk/DnD/backend/internal/abilities"
	"github.com/etozhenerk/DnD/backend/internal/creator"
)

// The advisor needs class foundations, not the UI's duplicate completed presets.
// Values remain a projection of the approved catalog; no rules are rewritten.
func marshalPublicCatalog(c *creator.Catalog) ([]byte, error) {
	type class struct {
		ID             string         `json:"id"`
		Name           string         `json:"name"`
		Description    string         `json:"description"`
		Weakness       string         `json:"weakness"`
		BaseStats      map[string]int `json:"baseStats"`
		BaseHP         int            `json:"baseHp"`
		BaseAC         int            `json:"baseAc"`
		DexterityACCap int            `json:"dexterityAcCap"`
	}
	classes := make([]class, 0, len(c.Rules.ClassProfiles))
	for _, cl := range c.Rules.ClassProfiles {
		classes = append(classes, class{cl.ID, cl.Name, cl.Description, cl.Weakness,
			cl.BaseStats, cl.BaseHP, cl.BaseAC, cl.DexterityACCap})
	}
	rules := c.Rules
	rules.ClassProfiles = nil
	return json.Marshal(struct {
		RulesetID    string          `json:"rulesetId"`
		Rules        creator.Rules   `json:"rules"`
		Classes      []class         `json:"classes"`
		Races        []creator.Race  `json:"races"`
		AbilityRules abilities.Rules `json:"abilityRules"`
	}{c.RulesetID, rules, classes, c.Races, c.AbilityRules})
}
