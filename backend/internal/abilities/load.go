package abilities

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"slices"
)

// Load rejects an unapproved catalog or a rules format this server cannot interpret.
func Load(path, creationID string, baseVersion int) (Rules, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Rules{}, fmt.Errorf("read ability rules: %w", err)
	}
	var r Rules
	if err := json.Unmarshal(data, &r); err != nil {
		return Rules{}, fmt.Errorf("decode ability rules: %w", err)
	}
	if r.Status != "approved" || r.ID == "" || !slug.MatchString(r.CharacterCreationRulesetID) || r.CharacterCreationRulesetID == creationID {
		return Rules{}, errors.New("ability rules need approval and a distinct creation ruleset")
	}
	if r.SourceCharacterCreationRulesetID != creationID || r.SourceRulesVersion != baseVersion {
		return Rules{}, errors.New("ability rules reference different source rules")
	}
	if err := r.checkSupported(); err != nil {
		return Rules{}, err
	}
	return r, nil
}

func (r *Rules) checkSupported() error {
	if r.Budget.Points < 1 || r.Budget.MaximumCustomAbilities < 1 || !r.Budget.UniqueProfiles || r.NarrativeAbilities.Maximum < 0 || r.NarrativeAbilities.Points != 0 || r.NarrativeAbilities.Resolution != "manual" || r.NarrativeAbilities.FormalMechanicalBenefit {
		return errors.New("unsupported ability budget")
	}
	if !slices.Equal(r.ModifierStats, []string{"strength", "dexterity", "wisdom", "intelligence", "charisma"}) {
		return errors.New("unsupported ability modifier stats")
	}
	b := r.BasicAction
	if b.ID != "basic-attack" || b.Kind != "damage" || b.Points != 0 || b.Uses != nil || b.Trigger != "action" || b.Target != "one-enemy" || b.Dice != (Dice{Count: 1, Sides: 6}) {
		return errors.New("unsupported basic attack")
	}
	seen := map[string]bool{b.ID: true}
	for _, p := range r.Profiles {
		if !slug.MatchString(p.ID) || seen[p.ID] || p.Points < 1 || p.Points > r.Budget.Points || p.Uses == nil || p.Uses.Scope != "battle" || p.Uses.Max < 1 || p.Uses.Max > 2 || p.Dice.Count < 1 || p.Dice.Count > 2 || (p.Dice.Sides != 6 && p.Dice.Sides != 8) {
			return errors.New("invalid ability profile")
		}
		if (p.Kind != "damage" || p.Target != "one-enemy") && (p.Kind != "healing" || p.Target != "one-friendly") {
			return errors.New("unsupported ability target")
		}
		seen[p.ID] = true
	}
	s := r.Resolution
	if len(r.Profiles) == 0 || s.Mode != "automatic" || s.ActionCost != 1 || s.MaximumEffectsPerAbility != 1 || s.MaximumTargets != 1 || s.DamageModifier != "selected-stat" || s.HealingModifier != "max-zero-selected-stat" || s.DamageMinimum != 0 || s.CriticalDamageMultiplier != 2 || s.HealingCanCritical || !s.SpendUseOnAttempt || !s.HealingRequiresActiveCombat || !s.HealingCanTargetSelf || s.HealingCeiling != "target-max-hp" || s.BattleRestore != "confirmed-new-hostile-encounter" || s.BattleRestoreAuthority != "game-master" {
		return errors.New("unsupported ability resolution")
	}
	return nil
}
