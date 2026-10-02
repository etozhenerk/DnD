package httpapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func decodeAdvisorMessage(w http.ResponseWriter, r *http.Request) (advisor.Input, error) {
	var body struct {
		RequestID *string         `json:"requestId"`
		Message   *string         `json:"message"`
		Mode      json.RawMessage `json:"mode"`
		Target    json.RawMessage `json:"target"`
		Context   *struct {
			StepID   *string         `json:"stepId"`
			Name     *string         `json:"name"`
			RaceID   *string         `json:"raceId"`
			ClassID  *string         `json:"classId"`
			Concept  *string         `json:"concept"`
			FormData json.RawMessage `json:"formData"`
		} `json:"context"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		return advisor.Input{}, err
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return advisor.Input{}, fmt.Errorf("one object required")
	}
	c := body.Context
	if body.RequestID == nil || body.Message == nil || c == nil || c.StepID == nil || c.Name == nil ||
		c.RaceID == nil || c.ClassID == nil || c.Concept == nil {
		return advisor.Input{}, advisor.ErrInvalid
	}
	in := advisor.Input{RequestID: strings.ToLower(*body.RequestID), Message: *body.Message,
		Context: advisor.Context{StepID: *c.StepID, Name: *c.Name, RaceID: *c.RaceID, ClassID: *c.ClassID, Concept: *c.Concept}}
	if len(c.FormData) > 0 {
		if json.Unmarshal(c.FormData, &in.Context.FormData) != nil || in.Context.FormData == nil {
			return advisor.Input{}, advisor.ErrInvalid
		}
	}
	if len(body.Target) > 0 {
		var target *string
		if json.Unmarshal(body.Target, &target) != nil || target == nil {
			return advisor.Input{}, advisor.ErrInvalid
		}
		in.Target = *target
	}
	if len(body.Mode) > 0 {
		if err := json.Unmarshal(body.Mode, &in.Mode); err != nil || in.Mode == "" {
			return advisor.Input{}, advisor.ErrInvalid
		}
	}
	return in, in.Validate()
}
