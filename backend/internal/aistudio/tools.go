package aistudio

import (
	"encoding/json"
	"fmt"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

type functionTool struct {
	Type     string `json:"type"`
	Function struct {
		Name        string          `json:"name"`
		Description string          `json:"description"`
		Parameters  json.RawMessage `json:"parameters"`
	} `json:"function"`
}

const characterParameters = `{"type":"object","additionalProperties":false,"required":["reply","character"],"properties":{"reply":{"type":"string","maxLength":1200},"character":{"type":"object","additionalProperties":false,"required":["appearance","raceId","classId","skills","equipment"],"properties":{"appearance":{"type":"object","additionalProperties":false,"required":["displayName","pronouns","appearance","story","motivation","personality"],"properties":{"displayName":{"type":"string","maxLength":120},"pronouns":{"type":"string","maxLength":1000},"appearance":{"type":"string","maxLength":1000},"story":{"type":"string","maxLength":1000},"motivation":{"type":"string","maxLength":1000},"personality":{"type":"array","maxItems":5,"items":{"type":"string","maxLength":120}}}},"raceId":{"type":"string"},"classId":{"type":"string"},"skills":{"type":"array","maxItems":3,"items":{"type":"object","additionalProperties":false,"required":["name","description","profileId","modifierStat"],"properties":{"name":{"type":"string","maxLength":120},"description":{"type":"string","maxLength":1000},"profileId":{"type":"string"},"modifierStat":{"type":"string"}}}},"equipment":{"type":"array","maxItems":8,"items":{"type":"object","additionalProperties":false,"required":["name","description"],"properties":{"name":{"type":"string","maxLength":120},"description":{"type":"string","maxLength":1000}}}}}}}}`

const imageParameters = `{"type":"object","additionalProperties":false,"required":["kind","prompt"],"properties":{"kind":{"type":"string","enum":["portrait","icon"]},"prompt":{"type":"string","minLength":1,"maxLength":500},"target":{"type":"string","maxLength":80,"description":"Existing skill ID for icon; omit for portrait"}}}`

func chatTools(messages []advisor.Message) ([]functionTool, error) {
	definitions := []struct{ name, description, schema string }{
		{"propose_character", "Prepare a complete character for the player's review when asked to fill fields or create a hero. Use only catalog IDs; server supplies balanced stats.", characterParameters},
		{"generate_character_image", "Draw one full-body character or an icon of an existing skill, only when explicitly requested by the player.", imageParameters},
	}
	tools := make([]functionTool, len(definitions))
	for i, definition := range definitions {
		tools[i].Type = "function"
		tools[i].Function.Name, tools[i].Function.Description = definition.name, definition.description
		tools[i].Function.Parameters = json.RawMessage(definition.schema)
	}
	raw, err := json.Marshal(tools)
	if err != nil || len(raw) > advisor.MaxToolBytes {
		return nil, fmt.Errorf("advisor tools exceeded envelope")
	}
	size := len(raw)
	for _, message := range messages {
		size += len(message.Content)
	}
	if size > advisor.MaxPromptBytes {
		return nil, fmt.Errorf("advisor tool prompt exceeded envelope")
	}
	return tools, nil
}
