// Package abilities validates and normalizes character skills without I/O.
package abilities

// Dice describes a roll; the constructor never rolls it during character creation.
type Dice struct {
	Count int `json:"count"`
	Sides int `json:"sides"`
}

// Uses defines a maximum number of attempts within a recovery scope.
type Uses struct {
	Scope string `json:"scope"`
	Max   int    `json:"max"`
}

// Profile is a server-owned combination of cost, dice, charges and target.
type Profile struct {
	ID      string `json:"id"`
	Kind    string `json:"kind"`
	Points  int    `json:"points"`
	Dice    Dice   `json:"dice"`
	Uses    *Uses  `json:"uses"`
	Target  string `json:"target"`
	Trigger string `json:"trigger,omitempty"`
}

// Resolution fixes the meaning of a normalized effect for its rules version.
type Resolution struct {
	Mode                        string `json:"mode"`
	ActionCost                  int    `json:"actionCost"`
	MaximumEffectsPerAbility    int    `json:"maximumEffectsPerAbility"`
	MaximumTargets              int    `json:"maximumTargets"`
	AttackBonusBase             int    `json:"attackBonusBase"`
	DamageModifier              string `json:"damageModifier"`
	HealingModifier             string `json:"healingModifier"`
	DamageMinimum               int    `json:"damageMinimum"`
	CriticalDamageMultiplier    int    `json:"criticalDamageMultiplier"`
	HealingCanCritical          bool   `json:"healingCanCritical"`
	SpendUseOnAttempt           bool   `json:"spendUseOnAttempt"`
	HealingRequiresActiveCombat bool   `json:"healingRequiresActiveCombat"`
	HealingCanTargetSelf        bool   `json:"healingCanTargetSelf"`
	HealingCeiling              string `json:"healingCeiling"`
	BattleRestore               string `json:"battleRestore"`
	BattleRestoreAuthority      string `json:"battleRestoreAuthority"`
}

// Rules is the approved ability catalog exposed by creator/options.
type Rules struct {
	ID                               string `json:"id"`
	Status                           string `json:"status"`
	CharacterCreationRulesetID       string `json:"characterCreationRulesetId"`
	SourceRulesVersion               int    `json:"sourceRulesVersion"`
	SourceCharacterCreationRulesetID string `json:"sourceCharacterCreationRulesetId"`
	Budget                           struct {
		Points                 int  `json:"points"`
		MaximumCustomAbilities int  `json:"maximumCustomAbilities"`
		MustSpendAll           bool `json:"mustSpendAll"`
		UniqueProfiles         bool `json:"uniqueProfiles"`
	} `json:"budget"`
	ModifierStats      []string   `json:"modifierStats"`
	BasicAction        Profile    `json:"basicAction"`
	Profiles           []Profile  `json:"profiles"`
	Resolution         Resolution `json:"resolution"`
	NarrativeAbilities struct {
		Maximum                 int    `json:"maximum"`
		Points                  int    `json:"points"`
		Resolution              string `json:"resolution"`
		FormalMechanicalBenefit bool   `json:"formalMechanicalBenefit"`
	} `json:"narrativeAbilities"`
}

// Profile returns a catalog profile without accepting any client-defined mechanics.
func (r *Rules) Profile(id string) (Profile, bool) {
	for _, p := range r.Profiles {
		if p.ID == id {
			return p, true
		}
	}
	return Profile{}, false
}
