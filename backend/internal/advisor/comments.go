package advisor

import "strings"

// ShortComment bounds a bubble without leaking model formatting into the form.
func ShortComment(raw string) string {
	text := strings.Join(strings.Fields(cleanReply(raw)), " ")
	text = strings.Trim(text, "#*` ")
	if text == "" {
		return "Чую интересную историю. Расскажешь о герое побольше?"
	}
	runes := []rune(text)
	if len(runes) <= 160 {
		return text
	}
	runes = runes[:157]
	if boundary := strings.LastIndex(string(runes), " "); boundary > 80 {
		return string(runes)[:boundary] + "…"
	}
	return string(runes) + "…"
}
