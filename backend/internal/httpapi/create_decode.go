package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/etozhenerk/DnD/backend/internal/abilities"
	"github.com/etozhenerk/DnD/backend/internal/characterapp"
)

var creationUUID = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

type creationBody struct {
	RequestID string          `json:"requestId"`
	RulesetID string          `json:"rulesetId"`
	FormData  json.RawMessage `json:"formData"`
}

type appearanceInput struct {
	DisplayName string   `json:"displayName"`
	Pronouns    string   `json:"pronouns"`
	RoleLabel   string   `json:"roleLabel"`
	Story       string   `json:"story"`
	Motivation  string   `json:"motivation"`
	Appearance  string   `json:"appearance"`
	Personality []string `json:"personality"`
}

type completeFormInput struct {
	Appearance *appearanceInput `json:"appearance"`
	Race       *struct {
		RaceID string `json:"raceId"`
	} `json:"race"`
	Class *struct {
		ClassID string `json:"classId"`
	} `json:"class"`
	Attributes map[string]int  `json:"attributes"`
	Abilities  json.RawMessage `json:"abilities"`
	Equipment  *struct {
		Items []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
		} `json:"items"`
	} `json:"equipment"`
}

func decodeCreation(w http.ResponseWriter, r *http.Request) (characterapp.CreateInput, error) {
	var body creationBody
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256<<10))
	d.DisallowUnknownFields()
	if err := d.Decode(&body); err != nil {
		return characterapp.CreateInput{}, err
	}
	var extra any
	if err := d.Decode(&extra); !errors.Is(err, io.EOF) {
		if err != nil {
			return characterapp.CreateInput{}, err
		}
		return characterapp.CreateInput{}, errors.New("expected one object")
	}
	if !creationUUID.MatchString(body.RequestID) || body.RulesetID == "" {
		return characterapp.CreateInput{}, errors.New("request ID and ruleset are required")
	}
	var form completeFormInput
	if err := strictCreationJSON(body.FormData, &form); err != nil {
		return characterapp.CreateInput{}, err
	}
	var sections map[string]json.RawMessage
	if err := json.Unmarshal(body.FormData, &sections); err != nil {
		return characterapp.CreateInput{}, err
	}
	if len(form.Abilities) > 0 {
		if _, err := abilities.Decode(form.Abilities); err != nil {
			return characterapp.CreateInput{}, err
		}
	}
	return characterapp.CreateInput{RequestID: strings.ToLower(body.RequestID), RulesetID: body.RulesetID, FormData: sections}, nil
}

func strictCreationJSON(raw []byte, target any) error {
	if trimmed := bytes.TrimSpace(raw); len(trimmed) == 0 || trimmed[0] != '{' {
		return errors.New("expected form object")
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(target); err != nil {
		return err
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return err
	}
	return rejectCreationNulls(value)
}

func rejectCreationNulls(value any) error {
	switch v := value.(type) {
	case nil:
		return errors.New("null is not allowed")
	case map[string]any:
		for key, child := range v {
			if key == "iconAssetId" && child == nil {
				continue
			}
			if err := rejectCreationNulls(child); err != nil {
				return err
			}
		}
	case []any:
		for _, child := range v {
			if err := rejectCreationNulls(child); err != nil {
				return err
			}
		}
	}
	return nil
}
