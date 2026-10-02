package main

func advisorGuidePath(getenv func(string) string) string {
	if path := getenv("ADVISOR_GUIDE_PATH"); path != "" {
		return path
	}
	return "../shared/advisor/guide.json"
}
