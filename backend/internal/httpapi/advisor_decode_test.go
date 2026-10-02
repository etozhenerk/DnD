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
		{"fill", strings.Replace(valid, `"message":`, `"mode":"fill","message":`, 1), true},
		{"suggest target", strings.Replace(valid, `"message":`, `"mode":"suggest","target":"name","message":`, 1), true},
		{"suggest without target", strings.Replace(valid, `"message":`, `"mode":"suggest","message":`, 1), false},
		{"portrait", strings.Replace(valid, `"message":`, `"mode":"portrait","message":`, 1), true},
		{"chat cannot target fields", strings.Replace(valid, `"message":`, `"target":"name","message":`, 1), false},
		{"null target", strings.Replace(valid, `"message":`, `"target":null,"message":`, 1), false},
		{"null snapshot", strings.Replace(valid, `"concept":""`, `"concept":"","formData":null`, 1), false},
		{"unknown snapshot section", strings.Replace(valid, `"concept":""`, `"concept":"","formData":{"admin":{}}`, 1), false},
		{"unknown mode", strings.Replace(valid, `"message":`, `"mode":"admin","message":`, 1), false},
		{"null mode", strings.Replace(valid, `"message":`, `"mode":null,"message":`, 1), false},
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
