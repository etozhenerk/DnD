package characterapp

import (
	"encoding/json"
	"fmt"
	"unicode/utf8"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

func completeFormIssues(form map[string]json.RawMessage, character creator.Character) []creator.Issue {
	issues := []creator.Issue{}
	for _, section := range []string{"appearance", "race", "class", "attributes", "abilities", "equipment"} {
		if len(form[section]) == 0 {
			issues = append(issues, creator.Issue{Path: section, Code: "required", Message: "Заполните раздел анкеты."})
		}
	}
	for i, trait := range character.Personality {
		if utf8.RuneCountInString(trait) > 120 {
			issues = append(issues, creator.Issue{Path: fmt.Sprintf("appearance.personality.%d", i), Code: "too_long", Message: "Черта характера длиннее 120 символов."})
		}
	}
	for i, item := range character.Equipment {
		path := fmt.Sprintf("equipment.items.%d", i)
		if len(item.ID) > 80 {
			issues = append(issues, creator.Issue{Path: path + ".id", Code: "too_long", Message: "ID предмета слишком длинный."})
		}
		if utf8.RuneCountInString(item.Description) > 2000 {
			issues = append(issues, creator.Issue{Path: path + ".description", Code: "too_long", Message: "Описание предмета длиннее 2000 символов."})
		}
	}
	var equipment struct {
		Items []json.RawMessage `json:"items"`
	}
	if raw := form["equipment"]; len(raw) > 0 && json.Unmarshal(raw, &equipment) == nil && equipment.Items == nil {
		issues = append(issues, creator.Issue{Path: "equipment.items", Code: "required", Message: "Подтвердите снаряжение, включая пустой набор."})
	}
	for i, raw := range equipment.Items {
		var fields map[string]json.RawMessage
		if json.Unmarshal(raw, &fields) == nil && len(fields["description"]) == 0 {
			issues = append(issues, creator.Issue{Path: fmt.Sprintf("equipment.items.%d.description", i), Code: "required", Message: "Добавьте описание предмета или оставьте его пустым."})
		}
	}
	return issues
}
