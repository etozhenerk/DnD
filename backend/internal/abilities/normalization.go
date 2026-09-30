package abilities

import (
	"fmt"
	"strings"
)

func (r *Rules) normalize(id, name, description, stat string, p Profile, stats map[string]int) Ability {
	modifier := stats[stat]
	e := Effect{RulesetID: r.ID, ProfileID: p.ID, Type: p.Kind, Target: p.Target, Dice: p.Dice, ModifierStat: stat, Modifier: modifier}
	if p.Kind == "healing" {
		e.Modifier = max(0, modifier)
	} else {
		bonus := r.Resolution.AttackBonusBase + modifier
		e.AttackBonus = &bonus
	}
	a := Ability{ID: id, Name: strings.TrimSpace(name), Description: strings.TrimSpace(description), ProfileID: p.ID, ModifierStat: stat, AutomationMode: r.Resolution.Mode, Trigger: "action", Effects: []Effect{e}}
	if p.Uses != nil {
		uses := *p.Uses
		a.Uses = &uses
	}
	a.EffectText = effectText(e, a.Uses)
	return a
}

func effectText(e Effect, uses *Uses) string {
	amount := fmt.Sprintf("%dd%d %+d", e.Dice.Count, e.Dice.Sides, e.Modifier)
	text := ""
	if e.Type == "damage" {
		text = fmt.Sprintf("Одно действие, один противник. Атака 1d20 %+d против AC; урон max(0, %s). Натуральная 1 — промах, 20 — удвоение итогового урона.", *e.AttackBonus, amount)
	} else {
		text = fmt.Sprintf("Одно действие в активном бою, один союзник или вы: восстановить %s HP до максимума цели. Без броска атаки и критов.", amount)
	}
	if uses != nil {
		text += fmt.Sprintf(" Лимит попыток за бой: %d. Заряд расходуется при попытке, для атаки — также при промахе. Восстановление — новая враждебная встреча, подтверждённая мастером.", uses.Max)
	}
	return text
}
