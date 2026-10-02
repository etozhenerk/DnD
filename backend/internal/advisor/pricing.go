package advisor

import "fmt"

// ModelName pins pricing and model together; a URI change requires a price review.
const ModelName = "deepseek-v4-flash"

// ImagePromptModelName pins the independent visual writer, priced at .2 RUB/1k
// input, cached input and output tokens on 2026-10-02.
const ImagePromptModelName = "yandexgpt-5-lite"

// Reservation deliberately exceeds a byte-level prompt estimate: three tokens
// per UTF-8 byte plus 1024 framing tokens. Tool schemas share this prompt envelope;
// image calls reserve their prompt writer and the fixed image price. No automatic retries.
// Provider-specific tokenization and current prices must be checked before enablement.
func Reservation() Money {
	return Money(MaxPromptBytes*3+1024)*300 + Money(MaxOutputTokens)*500
}

// Cost uses published RUB prices on 2026-10-02: input .3/1k, cache .075/1k,
// output .5/1k. OutputTokens already includes reasoning; do not add it twice.
func Cost(result Completion) (Money, error) {
	if result.ImagePrompt {
		if result.InputTokens < 1 || result.InputTokens > ImagePromptMaxBytes*3+1024 ||
			result.OutputTokens < 0 || result.OutputTokens > ImagePromptMaxOutputTokens ||
			result.CachedTokens < 0 || result.CachedTokens > result.InputTokens {
			return 0, fmt.Errorf("image prompt usage outside reserved envelope")
		}
		cost := Money(result.InputTokens+result.OutputTokens) * 200
		if result.ImageCharge {
			cost += ImagePrice
		}
		return cost, nil
	}
	if result.ImageCharge {
		if result.InputTokens != 0 || result.OutputTokens != 0 || result.CachedTokens != 0 {
			return 0, fmt.Errorf("unexpected image token usage")
		}
		return ImagePrice, nil
	}
	if result.InputTokens < 1 || result.InputTokens > MaxPromptBytes*3+1024 ||
		result.OutputTokens < 0 || result.OutputTokens > MaxOutputTokens ||
		result.CachedTokens < 0 || result.CachedTokens > result.InputTokens {
		return 0, fmt.Errorf("provider usage outside reserved envelope")
	}
	return Money(result.InputTokens-result.CachedTokens)*300 +
		Money(result.CachedTokens)*75 + Money(result.OutputTokens)*500, nil
}

// ImagePromptReservation covers the isolated writer's bounded text request.
func ImagePromptReservation() Money {
	return Money(ImagePromptMaxBytes*3+1024+ImagePromptMaxOutputTokens) * 200
}
