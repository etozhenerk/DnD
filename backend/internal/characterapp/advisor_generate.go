package characterapp

import (
	"context"
	"time"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

func (a *Advisor) generate(ctx context.Context, id string, in advisor.Input, messages []advisor.Message) (advisor.Completion, error) {
	timeout := 22 * time.Second
	if in.Mode == "" || in.Mode == "chat" || in.Mode == "fill" || in.Mode == "suggest" {
		timeout = 60 * time.Second
	}
	if in.Mode == "portrait" || in.Mode == "icon" {
		timeout = 100 * time.Second
	}
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	if in.Mode == "portrait" || in.Mode == "icon" {
		return a.makeImage(callCtx, id, in)
	}
	result, err := a.model.Complete(callCtx, messages, in.Mode)
	if err != nil {
		return result, err
	}
	if result.Tool != "" {
		if in.Mode != "" && in.Mode != "chat" {
			result.Reply = "Перо сбилось с курса. Попробуй попросить ещё раз."
			return result, nil
		}
		switch result.Tool {
		case "propose_character":
			result.Reply = a.prompt.PreserveAttributes(a.prompt.PrepareProposal(result.Reply), in.Context.FormData)
		case "generate_character_image":
			if a.ImagesEnabled() {
				result.Reply = advisor.PrepareImageAction(result.Reply, in)
			} else {
				result.Reply = "Кисти пока недоступны. Давай пока придумаем образ словами."
			}
		default:
			result.Reply = "Такого инструмента у меня пока нет. Попробуй описать задумку иначе."
		}
		return result, nil
	}
	switch in.Mode {
	case "", "chat":
		result.Reply = advisor.PrepareChatReply(result.Reply)
	case "fill":
		result.Reply = a.prompt.PrepareProposal(result.Reply)
		result.Reply = a.prompt.PreserveAttributes(result.Reply, in.Context.FormData)
	case "suggest":
		result.Reply = a.prompt.PrepareSuggestion(result.Reply, in.Target)
		if in.Target != "class" {
			result.Reply = a.prompt.PreserveAttributes(result.Reply, in.Context.FormData)
		}
	case "comment":
		result.Reply = advisor.ShortComment(result.Reply)
	}
	return result, nil
}
