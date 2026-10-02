package advisor

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type publicChronicle struct {
	ID      string   `json:"id"`
	Title   string   `json:"title"`
	Summary string   `json:"summary"`
	Result  string   `json:"result"`
	Story   []string `json:"story"`
}

// Only the three published, completed chronicles enter context. No scene bundle,
// dialogue bank, alternate ending, master notes or arbitrary filename is loaded.
func loadCompletedChronicles(contentDir string) (string, error) {
	files := []string{"nor-il-skald.json", "linda-small.json", "penisuela-chronicle.json"}
	public := make([]publicChronicle, 0, len(files))
	for _, name := range files {
		data, err := os.ReadFile(filepath.Join(contentDir, "campaigns", name))
		if err != nil || len(data) > 512<<10 {
			return "", fmt.Errorf("public advisor chronicle unavailable")
		}
		var source struct {
			ID        string `json:"id"`
			Title     string `json:"title"`
			Status    string `json:"status"`
			Chronicle struct {
				Summary string   `json:"completedSummary"`
				Result  string   `json:"finalResult"`
				Story   []string `json:"story"`
			} `json:"completedChronicle"`
		}
		if json.Unmarshal(data, &source) != nil || source.Status != "completed" || source.Chronicle.Result == "" {
			return "", fmt.Errorf("invalid completed advisor chronicle")
		}
		public = append(public, publicChronicle{source.ID, source.Title, source.Chronicle.Summary, source.Chronicle.Result, source.Chronicle.Story})
	}
	raw, err := json.Marshal(public)
	if err != nil || len(raw) > 12<<10 {
		return "", fmt.Errorf("advisor chronicles exceed size limit")
	}
	return string(raw), nil
}

func (p *Prompt) chronicleContext(history []Turn, in Input) string {
	topic := in.Message + " " + in.Context.Concept
	for i, count := len(history)-1, 0; i >= 0 && count < 2; i-- {
		if history[i].Status == "succeeded" {
			topic += " " + history[i].Message
			count++
		}
	}
	topic = strings.ToLower(topic)
	aliases := map[string][]string{
		"nor-il-skald": {"нор", "skald", "ледя", "сфинкс", "аэродракс"},
		"linda-small":  {"линда", "linda", "вьетим", "строганесс", "питахай"},
		"penisuela":    {"пенисуэл", "penisuela", "свадьб", "kreed", "angel", "нетак", "pussy sultan"},
	}
	type detail struct {
		ID    string   `json:"id"`
		Story []string `json:"story"`
	}
	var stories []detail
	for _, c := range p.chronicles {
		id := c.ID
		if strings.HasPrefix(id, "penisuela") {
			id = "penisuela"
		}
		for _, alias := range aliases[id] {
			if strings.Contains(topic, alias) {
				stories = append(stories, detail{c.ID, c.Story})
				break
			}
		}
	}
	if len(stories) == 0 {
		return ""
	}
	raw, err := json.Marshal(stories)
	if err != nil {
		return ""
	}
	return "\nПодробности публичной летописи по текущей теме: " + string(raw)
}
