package characterapp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

// CharacterWriter atomically saves a normalized character and handles repeat submissions.
type CharacterWriter interface {
	CreateCharacter(context.Context, creator.Character) (creator.Character, bool, error)
}

// CreateInput contains a whole form; request ID is not an ownership credential.
type CreateInput struct {
	RequestID string
	RulesetID string
	FormData  map[string]json.RawMessage
}

// Creation reports either validation issues or a committed character.
type Creation struct {
	Character  creator.Character
	Validation creator.Validation
	Created    bool
}

// Creator validates current rules before any database operation.
type Creator struct {
	catalog *creator.Catalog
	writer  CharacterWriter
}

// NewCreator connects approved rules with a persistence boundary.
func NewCreator(catalog *creator.Catalog, writer CharacterWriter) *Creator {
	return &Creator{catalog: catalog, writer: writer}
}

// Create saves an anonymous ready character without creating or reading a draft.
func (s *Creator) Create(ctx context.Context, input CreateInput) (Creation, error) {
	if input.RulesetID != s.catalog.RulesetID {
		return Creation{Validation: creator.Validation{Issues: []creator.Issue{{
			Path: "rulesetId", Code: "obsolete", Message: "Правила создания изменились. Обновите страницу перед сохранением.",
		}}}}, nil
	}
	validation, character := s.catalog.Validate(input.FormData)
	validation.Issues = append(validation.Issues, completeFormIssues(input.FormData, character)...)
	validation.Valid = len(validation.Issues) == 0
	result := Creation{Validation: validation}
	if !validation.Valid {
		return result, nil
	}
	character.ID = input.RequestID
	var err error
	result.Character, result.Created, err = s.writer.CreateCharacter(ctx, character)
	if err != nil {
		return Creation{}, fmt.Errorf("create character: %w", err)
	}
	return result, nil
}
