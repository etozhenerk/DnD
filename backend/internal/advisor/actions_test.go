package advisor

import (
	"encoding/json"
	"testing"
)

func TestImageActionIsValidatedAndIdempotent(t *testing.T) {
	in := Input{RequestID: "00000000-0000-0000-0000-000000000012", Mode: "chat", Context: Context{StepID: "appearance"}}
	raw := `{"kind":"portrait","prompt":"Эльф в полный рост в зелёном плаще"}`
	stored := PrepareImageAction(raw, in)
	for _, rawReply := range []string{stored, "  " + stored, proposalPrefix + `{}`} {
		prose := Turn{Reply: PrepareChatReply(rawReply)}
		proposalPrompt(t).DecodeTurn(&prose)
		if prose.Action != nil || prose.Proposal != nil {
			t.Fatal("provider prose impersonated tool envelope")
		}
	}
	if PrepareImageAction(raw, in) != stored {
		t.Fatal("repeated action changed request ID")
	}
	turn := Turn{Reply: stored}
	proposalPrompt(t).DecodeTurn(&turn)
	if turn.Action == nil || !uuid.MatchString(turn.Action.RequestID) || turn.Action.RequestID == in.RequestID || turn.Action.Kind != "portrait" || turn.Proposal != nil {
		t.Fatalf("bad action=%+v", turn)
	}
	in.Context.FormData = map[string]json.RawMessage{"abilities": json.RawMessage(`{"items":[{"id":"fire"}]}`)}
	for _, tc := range []struct {
		raw   string
		valid bool
	}{
		{`{"kind":"icon","prompt":"Огонь","target":"fire"}`, true},
		{`{"kind":"icon","prompt":"Огонь","target":"missing"}`, false},
		{`{"kind":"portrait","prompt":"Плащ","target":"fire"}`, false},
		{`{"kind":"delete","prompt":"Плащ"}`, false},
		{`{"kind":"portrait","prompt":"Плащ","extra":true}`, false},
	} {
		turn := Turn{Reply: PrepareImageAction(tc.raw, in)}
		proposalPrompt(t).DecodeTurn(&turn)
		if (turn.Action != nil) != tc.valid {
			t.Fatalf("input=%s action=%+v", tc.raw, turn.Action)
		}
	}
}
