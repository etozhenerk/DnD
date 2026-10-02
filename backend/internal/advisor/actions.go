package advisor

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

const imageActionPrefix = "advisor-image-action-v1:"

// PrepareChatReply prevents provider prose from impersonating a stored tool envelope.
func PrepareChatReply(raw string) string {
	if strings.HasPrefix(strings.TrimSpace(raw), imageActionPrefix) || strings.HasPrefix(strings.TrimSpace(raw), proposalPrefix) {
		return "Перо сбилось с курса. Попробуй описать задумку ещё раз."
	}
	return cleanReply(raw)
}

// ImageAction delegates one image call with a stable ID, charged by image admission.
type ImageAction struct {
	RequestID string `json:"requestId"`
	Kind      string `json:"kind"`
	Prompt    string `json:"prompt"`
	Target    string `json:"target,omitempty"`
}

type imageInstruction struct {
	Kind   string `json:"kind"`
	Prompt string `json:"prompt"`
	Target string `json:"target,omitempty"`
}

// PrepareImageAction validates the model's intent without generating or storing an image.
func PrepareImageAction(raw string, in Input) string {
	var instruction imageInstruction
	decoder := json.NewDecoder(strings.NewReader(raw))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&instruction) != nil || decoder.Decode(new(any)) != io.EOF || !validText(instruction.Prompt, 500) {
		return "Не получилось разобрать задумку для рисунка. Опиши её чуть короче."
	}
	check := in
	check.Mode, check.Target = instruction.Kind, instruction.Target
	if (check.Mode != "portrait" && check.Mode != "icon") || !validTarget(check.Mode, check.Target) || (check.Mode == "icon" && !imageSkillExists(check)) {
		return "Для иконки сначала добавь навык в анкету. Для героя можно попросить рисунок в полный рост."
	}
	hash := sha256.Sum256([]byte(in.RequestID + ":advisor-image-v1"))
	hash[6], hash[8] = (hash[6]&15)|80, (hash[8]&63)|128
	requestID := fmt.Sprintf("%x-%x-%x-%x-%x", hash[:4], hash[4:6], hash[6:8], hash[8:10], hash[10:16])
	data, err := json.Marshal(ImageAction{RequestID: requestID, Kind: instruction.Kind, Prompt: instruction.Prompt, Target: instruction.Target})
	if err != nil {
		return "Не получилось подготовить рисунок."
	}
	return imageActionPrefix + string(data)
}

func decodeImageAction(turn *Turn) bool {
	if !strings.HasPrefix(turn.Reply, imageActionPrefix) {
		return false
	}
	var action ImageAction
	decoder := json.NewDecoder(strings.NewReader(strings.TrimPrefix(turn.Reply, imageActionPrefix)))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&action) != nil || decoder.Decode(new(any)) != io.EOF || !uuid.MatchString(action.RequestID) ||
		!validText(action.Prompt, 500) || (action.Kind != "portrait" && action.Kind != "icon") || !validTarget(action.Kind, action.Target) {
		turn.Reply = "Не получилось прочитать поручение для рисунка."
		return true
	}
	turn.Action = &action
	turn.Reply = "Беру кисти! Сейчас нарисую вариант — выберешь, оставляем ли его герою."
	return true
}
