package httpapi

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAdvisorMessageSchemaIsStrict(t *testing.T) {
	valid := `{"requestId":"00000000-0000-0000-0000-000000000001","message":"Идея героя","context":{"stepId":"appearance","name":"","raceId":"","classId":"","concept":""}}`
	for _, tc := range []struct {
		name, body string
		accepted   bool
	}{
		{"valid", valid, true},
		{"unknown field", strings.Replace(valid, `"message":`, `"admin":true,"message":`, 1), false},
		{"missing field", strings.Replace(valid, `"name":"",`, "", 1), false},
		{"null context", strings.Replace(valid, `{"stepId":"appearance","name":"","raceId":"","classId":"","concept":""}`, "null", 1), false},
		{"second object", valid + ` {}`, false},
		{"oversized", strings.Replace(valid, "Идея героя", strings.Repeat("a", 17<<10), 1), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/advisor/sessions/id/messages", strings.NewReader(tc.body))
			_, err := decodeAdvisorMessage(httptest.NewRecorder(), req)
			if (err == nil) != tc.accepted {
				t.Fatalf("accepted=%v want=%v", err == nil, tc.accepted)
			}
		})
	}
}
