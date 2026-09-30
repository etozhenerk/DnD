package creator

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/etozhenerk/DnD/backend/internal/abilities"
)

func (c *Catalog) validateLegacyAbilities(raw json.RawMessage) ([]Ability, []Issue) {
	v := Validation{Issues: []Issue{}}
	ch := Character{}
	add := func(path, code, message string) {
		v.Issues = append(v.Issues, Issue{Path: path, Code: code, Message: message})
	}
	var section struct {
		Items []Ability `json:"items"`
	}
	if len(raw) > 0 && json.Unmarshal(raw, &section) != nil {
		add("abilities", "invalid", "Неверная структура навыков")
	}
	ch.Abilities = section.Items
	if ch.Abilities == nil {
		ch.Abilities = []Ability{}
	}
	if len(ch.Abilities) > 20 {
		add("abilities", "too_many", "Не более 20 навыков")
	}
	ids := map[string]bool{}
	for i, x := range ch.Abilities {
		ch.Abilities[i].AutomationMode = "manual"
		ch.Abilities[i].ProfileID = ""
		ch.Abilities[i].ModifierStat = ""
		if len(x.Effects) == 0 {
			ch.Abilities[i].Effects = []abilities.Effect{}
		}
		p := fmt.Sprintf("abilities.items.%d", i)
		if !slug.MatchString(x.ID) || ids[x.ID] {
			add(p+".id", "invalid", "ID навыка должен быть уникальным lower-kebab-case")
		}
		ids[x.ID] = true
		if strings.TrimSpace(x.Name) == "" || len([]rune(x.Name)) > 120 {
			add(p+".name", "invalid", "Укажите короткое название")
		}
		if strings.TrimSpace(x.Trigger) == "" || len([]rune(x.Trigger)) > 500 {
			add(p+".trigger", "invalid", "Укажите условие применения")
		}
		if strings.TrimSpace(x.EffectText) == "" || len([]rune(x.EffectText)) > 2000 {
			add(p+".effectText", "invalid", "Опишите эффект")
		}
		if len(x.Effects) > 0 {
			add(p+".effects", "unapproved", "Формальные эффекты недоступны в описательных навыках v1")
		}
		if x.IconAssetID != "" {
			add(p+".iconAssetId", "unavailable", "Загрузка иконок пока не подключена")
		}
		if x.Uses != nil && (!c.scopes[x.Uses.Scope] || x.Uses.Max < 1) {
			add(p+".uses", "invalid", "Неверный лимит использований")
		}
	}
	return ch.Abilities, v.Issues
}
