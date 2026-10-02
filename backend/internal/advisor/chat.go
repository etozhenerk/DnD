package advisor

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// Money uses integer millionths of a ruble, including VAT.
type Money int64

const (
	SessionBudget   Money = BudgetRub * 1_000_000
	MonthlyBudget   Money = 10_000 * 1_000_000
	MaxOutputTokens       = 4096
	MaxPromptBytes        = 32 << 10
	MaxToolBytes          = 4096
	MaxTurns              = 100
)

var (
	ErrNotFound    = errors.New("advisor session not found")
	ErrInvalid     = errors.New("invalid advisor input")
	ErrConflict    = errors.New("advisor request conflict")
	ErrBusy        = errors.New("advisor session busy")
	ErrLimit       = errors.New("advisor limit reached")
	ErrUnavailable = errors.New("advisor unavailable")
	uuid           = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

// Context is a bounded transient snapshot, never a stored character draft.
type Context struct {
	StepID   string                     `json:"stepId"`
	Name     string                     `json:"name"`
	RaceID   string                     `json:"raceId"`
	ClassID  string                     `json:"classId"`
	Concept  string                     `json:"concept"`
	FormData map[string]json.RawMessage `json:"formData,omitempty"`
}

// Input identifies one paid attempt; changing its contents requires a new ID.
type Input struct {
	RequestID string  `json:"requestId"`
	Mode      string  `json:"mode,omitempty"`
	Target    string  `json:"target,omitempty"`
	Message   string  `json:"message"`
	Context   Context `json:"context"`
}

// Turn holds a user message and the provider outcome, without transient context.
type Turn struct {
	RequestID string       `json:"requestId"`
	Message   string       `json:"message"`
	Reply     string       `json:"reply"`
	Proposal  *Proposal    `json:"proposal,omitempty"`
	Mode      string       `json:"mode,omitempty"`
	Target    string       `json:"target,omitempty"`
	Image     *ImageResult `json:"image,omitempty"`
	Action    *ImageAction `json:"action,omitempty"`
	Status    string       `json:"status"`
	Accounted Money        `json:"accountedMicroRub"`
	CreatedAt time.Time    `json:"createdAt"`
}

// Session is readable only with its capability token, until expiry.
type Session struct {
	ID        string    `json:"id"`
	ExpiresAt time.Time `json:"expiresAt"`
	Budget    Money     `json:"budgetMicroRub"`
	Accounted Money     `json:"accountedMicroRub"`
	Turns     []Turn    `json:"turns"`
}

// Message is a provider-neutral conversation entry.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Completion includes charged output tokens, including reasoning.
type Completion struct {
	Reply        string
	InputTokens  int
	OutputTokens int
	CachedTokens int
	ImageCharge  bool
	ImagePrompt  bool
	Asset        *ImageAsset
	Tool         string
}

// NewToken returns a bearer secret and its SHA-256; only the hash is stored.
func NewToken() (string, []byte, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", nil, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	return token, TokenHash(token), nil
}

// TokenHash must never be exposed in a public response.
func TokenHash(token string) []byte {
	hash := sha256.Sum256([]byte(token))
	return hash[:]
}

// ValidAccess rejects malformed identifiers before SQL or token comparison.
func ValidAccess(id, token string) bool {
	decoded, err := base64.RawURLEncoding.DecodeString(token)
	return uuid.MatchString(id) && err == nil && len(decoded) == 32 && len(token) == 43
}

// Validate checks payload limits; it does not validate or save a complete form.
func (in Input) Validate() error {
	if !uuid.MatchString(in.RequestID) || !validText(in.Message, 2000) || !validMode(in.Mode) || !validTarget(in.Mode, in.Target) {
		return ErrInvalid
	}
	steps := map[string]bool{"appearance": true, "race": true, "class": true, "attributes": true, "abilities": true, "equipment": true, "review": true}
	c := in.Context
	if !steps[c.StepID] {
		return ErrInvalid
	}
	for _, field := range []struct {
		value   string
		maximum int
	}{{c.Name, 120}, {c.RaceID, 80}, {c.ClassID, 80}, {c.Concept, 2000}} {
		if !utf8.ValidString(field.value) || utf8.RuneCountInString(field.value) > field.maximum || strings.ContainsRune(field.value, 0) {
			return ErrInvalid
		}
	}
	if strings.ContainsRune(in.Message, 0) {
		return ErrInvalid
	}
	if err := validateSnapshot(c.FormData); err != nil {
		return err
	}
	return nil
}

// Hash binds a request ID to the canonical typed input, including its snapshot.
func (in Input) Hash() []byte {
	data, _ := json.Marshal(in) // This fixed struct has no values that Marshal can reject.
	hash := sha256.Sum256(data)
	return hash[:]
}
