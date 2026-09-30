package abilities

// BasicInput allows presentation and a stat, never client-defined damage.
type BasicInput struct {
	Name         string  `json:"name"`
	Description  *string `json:"description"`
	ModifierStat string  `json:"modifierStat"`
}

// Input selects one approved profile for a player-named active ability.
type Input struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Description  *string `json:"description"`
	ProfileID    string  `json:"profileId"`
	ModifierStat string  `json:"modifierStat"`
	IconAssetID  *string `json:"iconAssetId"`
}

// NarrativeInput is an optional feature without numeric benefits.
type NarrativeInput struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// Section can be incomplete when saved, but must be complete for validation.
type Section struct {
	BasicAction    *BasicInput      `json:"basicAction"`
	Items          []Input          `json:"items"`
	NarrativeItems []NarrativeInput `json:"narrativeItems"`
}

// Effect snapshots server-calculated mechanics and their catalog identity.
type Effect struct {
	RulesetID    string `json:"rulesetId"`
	ProfileID    string `json:"profileId"`
	Type         string `json:"type"`
	Target       string `json:"target"`
	Dice         Dice   `json:"dice"`
	ModifierStat string `json:"modifierStat"`
	Modifier     int    `json:"modifier"`
	AttackBonus  *int   `json:"attackBonus,omitempty"`
}

// Ability is the normalized read model; old descriptive abilities remain manual.
type Ability struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	ProfileID      string   `json:"profileId,omitempty"`
	ModifierStat   string   `json:"modifierStat,omitempty"`
	EffectText     string   `json:"effectText"`
	AutomationMode string   `json:"automationMode"`
	Trigger        string   `json:"trigger"`
	Uses           *Uses    `json:"uses"`
	Effects        []Effect `json:"effects"`
	IconAssetID    string   `json:"iconAssetId,omitempty"`
}

// Issue identifies a field and a stable validation error code.
type Issue struct {
	Path    string `json:"path"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Result reports skill costs separately from characteristic points.
type Result struct {
	Valid        bool      `json:"valid"`
	PointsSpent  int       `json:"pointsSpent"`
	PointsBudget int       `json:"pointsBudget"`
	Issues       []Issue   `json:"issues"`
	Abilities    []Ability `json:"-"`
}
