package creator

import (
	"fmt"
	"strconv"
)

// FoundationRules identifies the constructor version with immutable class bases.
type FoundationRules struct {
	RulesetID   string `json:"rulesetId"`
	BaseBudget  int    `json:"baseBudget"`
	BonusBudget int    `json:"bonusBudget"`
}

func (c *Catalog) checkFoundations() error {
	r := c.Rules.ClassFoundation
	if !slug.MatchString(r.RulesetID) || r.RulesetID == c.Rules.ID || r.RulesetID == c.AbilityRules.CharacterCreationRulesetID {
		return fmt.Errorf("invalid class foundation ruleset")
	}
	if r.BaseBudget < 1 || r.BonusBudget < 1 || r.BaseBudget+r.BonusBudget != c.Rules.PointBuy.Budget {
		return fmt.Errorf("class foundation budgets do not match point buy")
	}
	for _, cl := range c.Rules.ClassProfiles {
		if err := c.checkClassFoundation(cl); err != nil {
			return err
		}
	}
	return nil
}

func (c *Catalog) checkClassFoundation(cl Class) error {
	if len(cl.BaseStats) != len(c.Rules.Stats) || len(cl.DefaultStats) != len(c.Rules.Stats) {
		return fmt.Errorf("class %s foundation and preset need six stats", cl.ID)
	}
	spent, negative, belowMinusTwo, atPlusFour := 0, 0, 0, 0
	for _, stat := range c.Rules.Stats {
		value, exists := cl.BaseStats[stat]
		preset, presetExists := cl.DefaultStats[stat]
		cost, valid := c.Rules.PointBuy.CostByModifier[strconv.Itoa(value)]
		if !exists || !presetExists || !valid || value < c.Rules.PointBuy.MinimumModifier || value > c.Rules.PointBuy.MaximumModifier || preset < value {
			return fmt.Errorf("class %s has invalid foundation %s", cl.ID, stat)
		}
		spent += cost
		if value < 0 {
			negative++
		}
		if value < -2 {
			belowMinusTwo++
		}
		if value == c.Rules.PointBuy.MaximumModifier {
			atPlusFour++
		}
	}
	if spent != c.Rules.ClassFoundation.BaseBudget || negative > c.Rules.PointBuy.MaximumNegativeStats || belowMinusTwo > c.Rules.PointBuy.MaximumStatsBelowMinusTwo || atPlusFour > c.Rules.PointBuy.MaximumStatsAtPlusFour {
		return fmt.Errorf("class %s foundation violates budget or limits", cl.ID)
	}
	return nil
}

func (c *Catalog) validateFoundation(classID string, attrs map[string]int) []Issue {
	cl, ok := c.classes[classID]
	if !ok {
		return nil
	}
	var issues []Issue
	for _, stat := range c.Rules.Stats {
		if value, exists := attrs[stat]; exists && value < cl.BaseStats[stat] {
			issues = append(issues, Issue{Path: "attributes." + stat, Code: "class_floor", Message: "Характеристика ниже основы выбранного класса"})
		}
	}
	return issues
}
