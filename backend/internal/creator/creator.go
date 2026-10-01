package creator

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/etozhenerk/DnD/backend/internal/abilities"
)

type Rules struct {
	ID                 string          `json:"id"`
	Status             string          `json:"status"`
	SourceRulesVersion int             `json:"sourceRulesVersion"`
	Stats              []string        `json:"stats"`
	RaceSelection      json.RawMessage `json:"raceSelection"`
	ClassSelection     struct {
		Explanation      string `json:"explanation"`
		SkillExplanation string `json:"skillExplanation"`
	} `json:"classSelection"`
	ClassFoundation FoundationRules `json:"classFoundation"`
	PointBuy        struct {
		Budget                    int            `json:"budget"`
		MustSpendAll              bool           `json:"mustSpendAll"`
		MinimumModifier           int            `json:"minimumModifier"`
		MaximumModifier           int            `json:"maximumModifier"`
		MaximumNegativeStats      int            `json:"maximumNegativeStats"`
		MaximumStatsBelowMinusTwo int            `json:"maximumStatsBelowMinusTwo"`
		MaximumStatsAtPlusFour    int            `json:"maximumStatsAtPlusFour"`
		CostByModifier            map[string]int `json:"costByModifier"`
	} `json:"pointBuy"`
	DerivedStats struct {
		MaxHP struct {
			ConstitutionMultiplier int `json:"constitutionMultiplier"`
		} `json:"maxHp"`
		BaseAC struct {
			Minimum                      int `json:"minimum"`
			Maximum                      int `json:"maximum"`
			MinimumDexterityContribution int `json:"minimumDexterityContribution"`
		} `json:"baseAc"`
	} `json:"derivedStats"`
	ClassProfiles []Class `json:"classProfiles"`
}

type Class struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	Description    string         `json:"description"`
	PlayStyle      string         `json:"playStyle"`
	Weakness       string         `json:"weakness"`
	BaseStats      map[string]int `json:"baseStats"`
	DefaultStats   map[string]int `json:"defaultStats"`
	BaseHP         int            `json:"baseHp"`
	BaseAC         int            `json:"baseAc"`
	DexterityACCap int            `json:"dexterityAcCap"`
}

type Race struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Status      string          `json:"status,omitempty"`
	Description string          `json:"description,omitempty"`
	Feature     json.RawMessage `json:"feature,omitempty"`
}

type Catalog struct {
	RulesetID    string          `json:"rulesetId"`
	AbilityRules abilities.Rules `json:"abilityRules"`
	Rules        Rules           `json:"rules"`
	Races        []Race          `json:"races"`
	raceIDs      map[string]bool
	classes      map[string]Class
	scopes       map[string]bool
}

func Load(dir string) (*Catalog, error) {
	rulesBytes, err := os.ReadFile(filepath.Join(dir, "character-creation.json"))
	if err != nil {
		return nil, err
	}
	racesBytes, err := os.ReadFile(filepath.Join(dir, "races.json"))
	if err != nil {
		return nil, err
	}
	baseBytes, err := os.ReadFile(filepath.Join(dir, "rules.json"))
	if err != nil {
		return nil, err
	}
	c := &Catalog{raceIDs: map[string]bool{}, classes: map[string]Class{}, scopes: map[string]bool{}, Races: []Race{}}
	if err = json.Unmarshal(rulesBytes, &c.Rules); err != nil {
		return nil, err
	}
	if c.Rules.Status != "approved" || c.Rules.ID == "" {
		return nil, errors.New("character creation rules not approved")
	}
	var base struct {
		Version     int      `json:"version"`
		UsageScopes []string `json:"usageScopes"`
	}
	if err = json.Unmarshal(baseBytes, &base); err != nil {
		return nil, err
	}
	if base.Version != c.Rules.SourceRulesVersion {
		return nil, errors.New("character creation rules reference a different base rules version")
	}
	for _, scope := range base.UsageScopes {
		c.scopes[scope] = true
	}
	var races []Race
	if err = json.Unmarshal(racesBytes, &races); err != nil {
		return nil, err
	}
	for _, r := range races {
		if r.Status == "playable" {
			c.Races = append(c.Races, r)
			c.raceIDs[r.ID] = true
		}
	}
	for _, cl := range c.Rules.ClassProfiles {
		if c.classes[cl.ID].ID != "" {
			return nil, fmt.Errorf("duplicate class %s", cl.ID)
		}
		c.classes[cl.ID] = cl
	}
	if len(c.Races) == 0 || len(c.classes) != 12 || len(c.Rules.Stats) != 6 {
		return nil, errors.New("incomplete creator catalog")
	}
	for _, cl := range c.Rules.ClassProfiles {
		spent := 0
		for _, stat := range c.Rules.Stats {
			cost, ok := c.Rules.PointBuy.CostByModifier[strconv.Itoa(cl.DefaultStats[stat])]
			if !ok {
				return nil, fmt.Errorf("invalid preset in %s", cl.ID)
			}
			spent += cost
		}
		if spent != c.Rules.PointBuy.Budget {
			return nil, fmt.Errorf("preset %s costs %d", cl.ID, spent)
		}
	}
	c.AbilityRules, err = abilities.Load(filepath.Join(dir, "character-abilities.json"), c.Rules.ID, base.Version)
	if err != nil {
		return nil, err
	}
	if err := c.checkFoundations(); err != nil {
		return nil, err
	}
	c.RulesetID = c.Rules.ClassFoundation.RulesetID
	return c, nil
}

type Appearance struct {
	DisplayName     string   `json:"displayName"`
	Pronouns        string   `json:"pronouns"`
	RoleLabel       string   `json:"roleLabel"`
	Story           string   `json:"story"`
	Motivation      string   `json:"motivation"`
	Appearance      string   `json:"appearance"`
	Personality     []string `json:"personality"`
	PortraitAssetID string   `json:"portraitAssetId"`
}

// Ability is a normalized skill or a legacy descriptive skill.
type Ability = abilities.Ability

type Item struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	EffectText  string            `json:"effectText"`
	Charges     *Uses             `json:"charges,omitempty"`
	Effects     []json.RawMessage `json:"effects,omitempty"`
}

// Uses defines the attempt limit and recovery scope.
type Uses = abilities.Uses

// Issue identifies a validation failure.
type Issue = abilities.Issue

type Derived struct {
	MaxHP       int `json:"maxHp"`
	BaseAC      int `json:"baseAc"`
	PointsSpent int `json:"pointsSpent"`
}
type Validation struct {
	Skills  *abilities.Result `json:"skills,omitempty"`
	Valid   bool              `json:"valid"`
	Issues  []Issue           `json:"issues"`
	Derived *Derived          `json:"derived,omitempty"`
}
type Character struct {
	PortraitURL     string         `json:"portraitUrl,omitempty"`
	PortraitAssetID string         `json:"-"`
	Assets          []Asset        `json:"-"`
	ID              string         `json:"id"`
	DisplayName     string         `json:"displayName"`
	Pronouns        string         `json:"pronouns,omitempty"`
	RoleLabel       string         `json:"roleLabel,omitempty"`
	RaceID          string         `json:"raceId"`
	ClassID         string         `json:"classId"`
	Story           string         `json:"story,omitempty"`
	Motivation      string         `json:"motivation,omitempty"`
	Appearance      string         `json:"appearance,omitempty"`
	Personality     []string       `json:"personality"`
	Attributes      map[string]int `json:"attributes"`
	MaxHP           int            `json:"maxHp"`
	BaseAC          int            `json:"baseAc"`
	Abilities       []Ability      `json:"abilities"`
	Equipment       []Item         `json:"equipment"`
	RulesetID       string         `json:"rulesetId"`
	CreatedAt       string         `json:"createdAt"`
}

type Summary struct {
	PortraitURL string `json:"portraitUrl,omitempty"`
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	RaceID      string `json:"raceId"`
	ClassID     string `json:"classId"`
	MaxHP       int    `json:"maxHp"`
	BaseAC      int    `json:"baseAc"`
	CreatedAt   string `json:"createdAt"`
}

var slug = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// Validate applies the current constructor rules to a complete form.
func (c *Catalog) Validate(form map[string]json.RawMessage) (Validation, Character) {
	return c.ValidateForRuleset(c.RulesetID, form)
}

// ValidateForRuleset preserves v1/v2 drafts and applies class foundations to v3.
func (c *Catalog) ValidateForRuleset(rulesetID string, form map[string]json.RawMessage) (Validation, Character) {
	v := Validation{Issues: []Issue{}}
	ch := Character{Personality: []string{}, Attributes: map[string]int{}, Abilities: []Ability{}, Equipment: []Item{}, RulesetID: rulesetID}
	add := func(path, code, message string) {
		v.Issues = append(v.Issues, Issue{Path: path, Code: code, Message: message})
	}
	if rulesetID != c.Rules.ID && rulesetID != c.AbilityRules.CharacterCreationRulesetID && rulesetID != c.RulesetID {
		add("rulesetId", "obsolete", "Правила черновика больше не доступны")
		return v, ch
	}
	if len(form["appearance"]) == 0 {
		add("appearance", "required", "Заполните внешность и имя")
	}
	if err := json.Unmarshal(form["appearance"], &Appearance{}); len(form["appearance"]) > 0 && err != nil {
		add("appearance", "invalid", "Неверная структура раздела")
	}
	var a Appearance
	_ = json.Unmarshal(form["appearance"], &a)
	ch.DisplayName = strings.TrimSpace(a.DisplayName)
	ch.Pronouns = strings.TrimSpace(a.Pronouns)
	ch.RoleLabel = strings.TrimSpace(a.RoleLabel)
	ch.Story = strings.TrimSpace(a.Story)
	ch.Motivation = strings.TrimSpace(a.Motivation)
	ch.Appearance = strings.TrimSpace(a.Appearance)
	ch.Personality = a.Personality
	if ch.Personality == nil {
		ch.Personality = []string{}
	}
	if ch.DisplayName == "" {
		add("appearance.displayName", "required", "Введите имя персонажа")
	} else if len([]rune(ch.DisplayName)) > 120 {
		add("appearance.displayName", "too_long", "Имя длиннее 120 символов")
	}
	if a.PortraitAssetID != "" {
		add("appearance.portraitAssetId", "unavailable", "Загрузка портретов пока не подключена")
	}
	for _, s := range []struct{ path, value string }{{"pronouns", a.Pronouns}, {"roleLabel", a.RoleLabel}, {"story", a.Story}, {"motivation", a.Motivation}, {"appearance", a.Appearance}} {
		if len([]rune(s.value)) > 4000 {
			add("appearance."+s.path, "too_long", "Текст слишком длинный")
		}
	}
	if len(ch.Personality) > 20 {
		add("appearance.personality", "too_many", "Не более 20 черт")
	}
	var race struct {
		RaceID string `json:"raceId"`
	}
	if len(form["race"]) == 0 || json.Unmarshal(form["race"], &race) != nil || !c.raceIDs[race.RaceID] {
		add("race.raceId", "invalid", "Выберите игровую расу")
	}
	ch.RaceID = race.RaceID
	var class struct {
		ClassID string `json:"classId"`
	}
	if len(form["class"]) == 0 || json.Unmarshal(form["class"], &class) != nil || c.classes[class.ClassID].ID == "" {
		add("class.classId", "invalid", "Выберите класс")
	}
	ch.ClassID = class.ClassID
	var attrs map[string]int
	if len(form["attributes"]) == 0 || json.Unmarshal(form["attributes"], &attrs) != nil {
		add("attributes", "required", "Распределите характеристики")
	}
	if len(attrs) != 6 {
		add("attributes", "invalid", "Нужны все шесть характеристик")
	}
	negative, belowMinusTwo, atPlusFour, spent := 0, 0, 0, 0
	for _, stat := range c.Rules.Stats {
		n, ok := attrs[stat]
		if !ok {
			add("attributes."+stat, "required", "Характеристика не задана")
			continue
		}
		ch.Attributes[stat] = n
		cost, exists := c.Rules.PointBuy.CostByModifier[strconv.Itoa(n)]
		if !exists || n < c.Rules.PointBuy.MinimumModifier || n > c.Rules.PointBuy.MaximumModifier {
			add("attributes."+stat, "range", "Модификатор вне диапазона")
			continue
		}
		spent += cost
		if n < 0 {
			negative++
		}
		if n < -2 {
			belowMinusTwo++
		}
		if n == 4 {
			atPlusFour++
		}
	}
	for stat := range attrs {
		found := false
		for _, s := range c.Rules.Stats {
			if s == stat {
				found = true
				break
			}
		}
		if !found {
			add("attributes."+stat, "unknown", "Неизвестная характеристика")
		}
	}
	if spent != c.Rules.PointBuy.Budget {
		message := fmt.Sprintf("Нужно распределить ровно %d очков, сейчас %d", c.Rules.PointBuy.Budget, spent)
		if rulesetID == c.RulesetID {
			message = fmt.Sprintf("Нужно распределить ровно %d дополнительных очков, сейчас %d", c.Rules.ClassFoundation.BonusBudget, spent-c.Rules.ClassFoundation.BaseBudget)
		}
		add("attributes", "budget", message)
	}
	if rulesetID == c.RulesetID {
		v.Issues = append(v.Issues, c.validateFoundation(class.ClassID, attrs)...)
	}
	if negative > c.Rules.PointBuy.MaximumNegativeStats || belowMinusTwo > c.Rules.PointBuy.MaximumStatsBelowMinusTwo || atPlusFour > c.Rules.PointBuy.MaximumStatsAtPlusFour {
		add("attributes", "limits", "Нарушены пределы отрицательных или максимальных характеристик")
	}
	if cl, ok := c.classes[class.ClassID]; ok && len(attrs) == 6 {
		dex := attrs["dexterity"]
		if dex < c.Rules.DerivedStats.BaseAC.MinimumDexterityContribution {
			dex = c.Rules.DerivedStats.BaseAC.MinimumDexterityContribution
		}
		if dex > cl.DexterityACCap {
			dex = cl.DexterityACCap
		}
		ac := cl.BaseAC + dex
		if ac < c.Rules.DerivedStats.BaseAC.Minimum {
			ac = c.Rules.DerivedStats.BaseAC.Minimum
		}
		if ac > c.Rules.DerivedStats.BaseAC.Maximum {
			ac = c.Rules.DerivedStats.BaseAC.Maximum
		}
		v.Derived = &Derived{MaxHP: cl.BaseHP + c.Rules.DerivedStats.MaxHP.ConstitutionMultiplier*attrs["constitution"], BaseAC: ac, PointsSpent: spent}
		ch.MaxHP = v.Derived.MaxHP
		ch.BaseAC = ac
	}
	if rulesetID == c.Rules.ID {
		var issues []Issue
		ch.Abilities, issues = c.validateLegacyAbilities(form["abilities"])
		v.Issues = append(v.Issues, issues...)
	} else {
		skills := c.AbilityRules.Validate(form["abilities"], ch.Attributes)
		v.Skills = &skills
		v.Issues = append(v.Issues, skills.Issues...)
		ch.Abilities = skills.Abilities
	}
	var equipment struct {
		Items []Item `json:"items"`
	}
	if raw := form["equipment"]; len(raw) > 0 && json.Unmarshal(raw, &equipment) != nil {
		add("equipment", "invalid", "Неверная структура снаряжения")
	}
	ch.Equipment = equipment.Items
	if ch.Equipment == nil {
		ch.Equipment = []Item{}
	}
	if len(ch.Equipment) > 20 {
		add("equipment", "too_many", "Не более 20 предметов")
	}
	ids := map[string]bool{}
	for i, x := range ch.Equipment {
		p := fmt.Sprintf("equipment.items.%d", i)
		if !slug.MatchString(x.ID) || ids[x.ID] {
			add(p+".id", "invalid", "ID предмета должен быть уникальным lower-kebab-case")
		}
		ids[x.ID] = true
		if strings.TrimSpace(x.Name) == "" || len([]rune(x.Name)) > 120 {
			add(p+".name", "invalid", "Укажите короткое название")
		}
		if len(x.Effects) > 0 {
			add(p+".effects", "unapproved", "Формальные эффекты требуют отдельного утверждения баланса")
		}
		if x.Charges != nil && (!c.scopes[x.Charges.Scope] || x.Charges.Max < 1) {
			add(p+".charges", "invalid", "Неверный лимит зарядов")
		}
	}
	v.Valid = len(v.Issues) == 0
	return v, ch
}
