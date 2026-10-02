package aistudio

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func TestToolRepliesPreserveUsageAndRejectUnsafeCalls(t *testing.T) {
	for _, tc := range []struct{ name, arguments, finish, want string }{
		{"propose_character", `{"reply":"Беру перо!","character":{}}`, "tool_calls", "propose_character"},
		{"generate_character_image", `{"kind":"portrait","prompt":"Герой в полный рост"}`, "tool_calls", "generate_character_image"},
		{"delete_character", `{}`, "tool_calls", ""},
		{"propose_character", `broken`, "tool_calls", ""},
		{"propose_character", `{}`, "length", ""},
	} {
		t.Run(tc.name+tc.finish+tc.arguments, func(t *testing.T) {
			args, _ := json.Marshal(tc.arguments)
			data := `{"choices":[{"message":{"content":null,"tool_calls":[{"type":"function","function":{"name":"` + tc.name + `","arguments":` + string(args) + `}}]},"finish_reason":"` + tc.finish + `"}],"usage":{"prompt_tokens":100,"completion_tokens":200}}`
			result, err := decodeCompletion([]byte(data))
			if err != nil || result.Tool != tc.want || result.InputTokens != 100 || result.OutputTokens != 200 || result.Reply == "" {
				t.Fatalf("tool/usage=%+v err=%v", result, err)
			}
		})
	}
}

func TestToolSchemasShareReservedPromptEnvelope(t *testing.T) {
	if _, err := chatTools([]advisor.Message{{Content: strings.Repeat("x", advisor.MaxPromptBytes)}}); err == nil {
		t.Fatal("schemas exceeded reserved input")
	}
	tools, err := chatTools([]advisor.Message{{Content: strings.Repeat("x", advisor.MaxPromptBytes-advisor.MaxToolBytes)}})
	if err != nil || len(tools) != 2 {
		t.Fatalf("legal prompt rejected: %v", err)
	}
}
