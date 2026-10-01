package main

import (
	"net/http"
	"strings"
)

func restrictDrafts(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/drafts" || strings.HasPrefix(r.URL.Path, "/drafts/") {
			// A legacy draft token is not a user identity. Keep every draft action
			// closed until authentication and ownership checks are implemented.
			fail(w, http.StatusForbidden, "drafts_require_authentication", "Черновики доступны только после входа. Авторизация ещё не подключена.")
			return
		}
		next.ServeHTTP(w, r)
	})
}
