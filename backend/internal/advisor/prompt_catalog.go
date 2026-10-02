package advisor

import (
	"encoding/json"
	"github.com/etozhenerk/DnD/backend/internal/abilities"
	"github.com/etozhenerk/DnD/backend/internal/creator"
)

// Keep the catalog compact: descriptions and approved mechanics, without UI copy,
// duplicate presets, runtime resolution, presentation or master-only data.
func marshalPublicCatalog(c *creator.Catalog) ([]byte, error) {
	type class struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Weakness    string `json:"weakness"`
	}
	classes := make([]class, 0, len(c.Rules.ClassProfiles))
	for _, cl := range c.Rules.ClassProfiles {
		classes = append(classes, class{cl.ID, cl.Name, cl.Description, cl.Weakness})
	}
	return json.Marshal(struct {
		RulesetID     string              `json:"rulesetId"`
		Classes       []class             `json:"classes"`
		Races         []creator.Race      `json:"races"`
		SkillBudget   int                 `json:"skillBudget"`
		Profiles      []abilities.Profile `json:"profiles"`
		ModifierStats []string            `json:"modifierStats"`
		Note          string              `json:"note"`
	}{c.RulesetID, classes, c.Races, c.AbilityRules.Budget.Points, c.AbilityRules.Profiles, c.AbilityRules.ModifierStats,
		"Основа класса неснижаема, ещё 4 очка усиления по цене каталога. Раса не меняет характеристики. Бесплатная атака 1d6; до 3 разных навыков с одиночным уроном/лечением. HP/AC и характеристики для заполнения вычисляет сервер, не модель."})
}
