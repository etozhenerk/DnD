package advisor

import (
	"encoding/json"
	"strings"
)

func validMode(mode string) bool {
	switch mode {
	case "", "chat", "comment", "suggest", "fill", "portrait", "icon":
		return true
	default:
		return false
	}
}

func validTarget(mode, target string) bool {
	if mode == "icon" {
		return validText(target, 80) && !strings.ContainsRune(target, 0)
	}
	if mode == "suggest" {
		switch target {
		case "name", "appearance", "race", "class", "abilities", "equipment":
			return true
		}
		return false
	}
	return target == ""
}

func validateSnapshot(form map[string]json.RawMessage) error {
	allowed := map[string]bool{"appearance": true, "race": true, "class": true, "attributes": true, "abilities": true, "equipment": true}
	raw, err := json.Marshal(form)
	if err != nil || len(raw) > 12<<10 {
		return ErrInvalid
	}
	for key, data := range form {
		var value map[string]json.RawMessage
		if !allowed[key] || json.Unmarshal(data, &value) != nil || value == nil {
			return ErrInvalid
		}
	}
	return nil
}
