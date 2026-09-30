package abilities

import (
	"encoding/json"
	"fmt"
	"slices"
	"strings"
)

const (
	maximumIDLength          = 80
	maximumNameLength        = 120
	maximumDescriptionLength = 2000
)

// Validate checks complete skills and computes their normalized effects from stats.
func (r *Rules) Validate(raw json.RawMessage, stats map[string]int) Result {
	v := Result{PointsBudget: r.Budget.Points, Issues: []Issue{}, Abilities: []Ability{}}
	if len(raw) == 0 {
		v.add("abilities", "required", "Заполните раздел навыков")
		return v
	}
	s, err := Decode(raw)
	if err != nil {
		v.add("abilities", "invalid", "Неверная структура навыков или неподдержанное поле")
		return v
	}
	ids := map[string]bool{r.BasicAction.ID: true}
	r.validateBasic(s.BasicAction, stats, &v)
	r.validateActive(s.Items, stats, ids, &v)
	r.validateNarrative(s.NarrativeItems, ids, &v)
	if v.PointsSpent > v.PointsBudget || (r.Budget.MustSpendAll && v.PointsSpent != v.PointsBudget) {
		v.add("abilities.items", "budget", fmt.Sprintf("Доступно %d очков навыков, выбрано %d", v.PointsBudget, v.PointsSpent))
	}
	v.Valid = len(v.Issues) == 0
	if !v.Valid {
		v.Abilities = []Ability{}
	}
	return v
}

func (v *Result) add(path, code, message string) {
	v.Issues = append(v.Issues, Issue{Path: path, Code: code, Message: message})
}

func (r *Rules) validateBasic(x *BasicInput, stats map[string]int, v *Result) {
	if x == nil {
		v.add("abilities.basicAction", "required", "Заполните базовую атаку")
		return
	}
	before := len(v.Issues)
	validateText("abilities.basicAction", x.Name, x.Description, v)
	r.validateStat("abilities.basicAction.modifierStat", x.ModifierStat, stats, v)
	if len(v.Issues) == before {
		v.Abilities = append(v.Abilities, r.normalize(r.BasicAction.ID, x.Name, *x.Description, x.ModifierStat, r.BasicAction, stats))
	}
}

func (r *Rules) validateActive(items []Input, stats map[string]int, ids map[string]bool, v *Result) {
	if items == nil {
		v.add("abilities.items", "required", "Укажите список активных навыков, он может быть пустым")
	}
	if len(items) > r.Budget.MaximumCustomAbilities {
		v.add("abilities.items", "too_many", fmt.Sprintf("Не более %d активных навыков", r.Budget.MaximumCustomAbilities))
	}
	profiles := map[string]bool{}
	for i, x := range items {
		path := fmt.Sprintf("abilities.items.%d", i)
		before := len(v.Issues)
		validateID(path, x.ID, ids, v)
		validateText(path, x.Name, x.Description, v)
		r.validateStat(path+".modifierStat", x.ModifierStat, stats, v)
		p, ok := r.Profile(x.ProfileID)
		if !ok {
			v.add(path+".profileId", "unknown_profile", "Выберите профиль из каталога")
		} else {
			v.PointsSpent += p.Points
		}
		if profiles[x.ProfileID] {
			v.add(path+".profileId", "duplicate_profile", "Один профиль можно выбрать только один раз")
		}
		profiles[x.ProfileID] = true
		if x.IconAssetID != nil {
			v.add(path+".iconAssetId", "asset_unavailable", "Загрузка иконок пока не подключена")
		}
		if len(v.Issues) == before {
			v.Abilities = append(v.Abilities, r.normalize(x.ID, x.Name, *x.Description, x.ModifierStat, p, stats))
		}
	}
}

func (r *Rules) validateNarrative(items []NarrativeInput, ids map[string]bool, v *Result) {
	if items == nil {
		v.add("abilities.narrativeItems", "required", "Укажите список особенностей, он может быть пустым")
	}
	if len(items) > r.NarrativeAbilities.Maximum {
		v.add("abilities.narrativeItems", "too_many", fmt.Sprintf("Не более %d повествовательных особенностей", r.NarrativeAbilities.Maximum))
	}
	for i, x := range items {
		path := fmt.Sprintf("abilities.narrativeItems.%d", i)
		before := len(v.Issues)
		validateID(path, x.ID, ids, v)
		validateText(path, x.Name, &x.Description, v)
		if strings.TrimSpace(x.Description) == "" {
			v.add(path+".description", "required", "Опишите особенность")
		}
		if len(v.Issues) == before {
			v.Abilities = append(v.Abilities, Ability{ID: x.ID, Name: strings.TrimSpace(x.Name), Description: strings.TrimSpace(x.Description), EffectText: "Применение по решению мастера; числовых бонусов нет.", AutomationMode: "manual", Trigger: "manual", Effects: []Effect{}})
		}
	}
}

func (r *Rules) validateStat(path, stat string, stats map[string]int, v *Result) {
	_, exists := stats[stat]
	if !slices.Contains(r.ModifierStats, stat) || !exists {
		v.add(path, "unknown_stat", "Выберите допустимую распределённую характеристику")
	}
}

func validateID(path, id string, seen map[string]bool, v *Result) {
	if len(id) > maximumIDLength || !slug.MatchString(id) {
		v.add(path+".id", "invalid", "ID должен быть lower-kebab-case длиной до 80 символов")
	}
	if seen[id] {
		v.add(path+".id", "duplicate_id", "ID уже используется, включая базовую атаку")
	}
	seen[id] = true
}

func validateText(path, name string, description *string, v *Result) {
	if strings.TrimSpace(name) == "" {
		v.add(path+".name", "required", "Введите название")
	} else if len([]rune(name)) > maximumNameLength {
		v.add(path+".name", "too_long", "Название длиннее 120 символов")
	}
	if description == nil {
		v.add(path+".description", "required", "Укажите описание, оно может быть пустым")
	} else if len([]rune(*description)) > maximumDescriptionLength {
		v.add(path+".description", "too_long", "Описание длиннее 2000 символов")
	}
}
