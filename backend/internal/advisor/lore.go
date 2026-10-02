package advisor

import (
	"encoding/json"
	"fmt"
	"os"
)

// This explicit projection is the only map data sent to AI. Adding other world
// or campaign fields requires a separate public-data review.
func loadPublicLore(path string) (string, error) {
	var world struct {
		Regions []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Subtitle    string `json:"subtitle,omitempty"`
			Description string `json:"description"`
			Teaser      *struct {
				Description string `json:"description"`
			} `json:"teaser,omitempty"`
		} `json:"regions"`
	}
	data, err := os.ReadFile(path)
	if err != nil || len(data) > 64<<10 {
		return "", fmt.Errorf("public advisor lore unavailable")
	}
	if err := json.Unmarshal(data, &world); err != nil || len(world.Regions) == 0 || len(world.Regions) > 16 {
		return "", fmt.Errorf("invalid public advisor lore")
	}
	public, err := json.Marshal(world)
	if err != nil {
		return "", fmt.Errorf("serialize public advisor lore: %w", err)
	}
	return string(public), nil
}
