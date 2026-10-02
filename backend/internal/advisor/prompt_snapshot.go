package advisor

import "encoding/json"

// contextSnapshot trims optional descriptive context before rejecting a legal message.
// The original snapshot remains available for validation and request idempotency.
func contextSnapshot(in Input, available int) ([]byte, error) {
	raw, err := json.Marshal(in.Context)
	if err != nil {
		return nil, err
	}
	if len(raw) <= available {
		return raw, nil
	}
	brief := in.Context
	brief.FormData = nil
	runes := []rune(brief.Concept)
	if len(runes) > 100 {
		brief.Concept = string(runes[:100]) + "… (контекст сокращён)"
	}
	raw, err = json.Marshal(brief)
	if err != nil {
		return nil, err
	}
	if len(raw) > available {
		return nil, ErrInvalid
	}
	return raw, nil
}
