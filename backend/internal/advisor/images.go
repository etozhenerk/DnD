package advisor

import (
	"encoding/json"
	"strings"
)

// ImageModelName pins the documented text-to-image model and its request tariff.
const ImageModelName = "aliceai-image-art-3.0"

// ImagePrice is 2.23 RUB including VAT per request, verified 2026-10-02.
const ImagePrice Money = 2_230_000

// ImageAsset is private immutable storage metadata; no key reaches the browser.
type ImageAsset struct {
	ObjectKey string `json:"objectKey"`
	MIMEType  string `json:"mimeType"`
	SHA256    string `json:"sha256"`
	SizeBytes int64  `json:"sizeBytes"`
}

// ImageResult describes a binary result retrievable only with the session capability.
type ImageResult struct {
	RequestID string `json:"requestId"`
	Kind      string `json:"kind"`
	Target    string `json:"target,omitempty"`
	MIMEType  string `json:"mimeType"`
}

// ImagePrompt bounds the prompt to 500 runes, retaining the player's requested changes.
func (p *Prompt) ImagePrompt(in Input) string {
	style := "Тёмное сказочное фэнтези, живописная иллюстрация, мягкий свет, без надписей. "
	if in.Mode == "icon" {
		style += "Квадратная иконка умения, выразительный символ и чистый силуэт. "
	} else {
		style += "Портрет героя по пояс, лицо хорошо видно, атмосферный фон. "
	}
	description := ""
	for _, race := range p.catalog.Races {
		if race.ID == in.Context.RaceID {
			description += "Раса: " + race.Name + ". "
		}
	}
	for _, cl := range p.catalog.Rules.ClassProfiles {
		if cl.ID == in.Context.ClassID {
			description += "Класс: " + cl.Name + ". "
		}
	}
	var appearance struct {
		Appearance string `json:"appearance"`
	}
	if json.Unmarshal(in.Context.FormData["appearance"], &appearance) == nil && in.Mode != "icon" {
		description += appearance.Appearance
	}
	return shortImageText(style+shortImageText(in.Message, 230)+". "+description, 500)
}

func shortImageText(text string, maximum int) string {
	runes := []rune(strings.TrimSpace(text))
	if len(runes) > maximum {
		runes = runes[:maximum]
	}
	return string(runes)
}

func imageSkillExists(in Input) bool {
	var section struct {
		Items []struct {
			ID string `json:"id"`
		} `json:"items"`
	}
	if json.Unmarshal(in.Context.FormData["abilities"], &section) != nil {
		return false
	}
	for _, skill := range section.Items {
		if skill.ID == in.Target {
			return true
		}
	}
	return false
}

// ReservationFor includes every paid tool in the same session/month envelope.
func ReservationFor(mode string) Money {
	if mode == "portrait" || mode == "icon" {
		return ImagePrice
	}
	return Reservation()
}
