package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/etozhenerk/DnD/backend/internal/storage"
)

type server struct {
	catalog *creator.Catalog
	store   *storage.Store
	origins map[string]bool
}
type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}
func fail(w http.ResponseWriter, status int, code, message string) {
	jsonResponse(w, status, apiError{code, message})
}
func internal(w http.ResponseWriter, err error) {
	log.Printf("api internal error: %T", err)
	fail(w, 500, "internal_error", "Ошибка сервера")
}
func newHandler(c *creator.Catalog, st *storage.Store, origins []string) http.Handler {
	s := &server{catalog: c, store: st, origins: map[string]bool{}}
	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			s.origins[origin] = true
		}
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) { jsonResponse(w, 200, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /creator/options", s.options)
	mux.HandleFunc("POST /drafts", s.createDraft)
	mux.HandleFunc("GET /drafts/{draftId}", s.getDraft)
	mux.HandleFunc("PATCH /drafts/{draftId}", s.patchDraft)
	mux.HandleFunc("POST /drafts/{draftId}/advice", s.advice)
	mux.HandleFunc("POST /drafts/{draftId}/assets", s.assets)
	mux.HandleFunc("POST /drafts/{draftId}/validate", s.validateDraft)
	mux.HandleFunc("POST /drafts/{draftId}/complete", s.completeDraft)
	mux.HandleFunc("GET /characters", s.listCharacters)
	mux.HandleFunc("GET /characters/{characterId}", s.getCharacter)
	return s.cors(mux)
}
func (s *server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Add("Vary", "Origin")
			if !s.origins[origin] {
				fail(w, 403, "origin_forbidden", "Источник запроса не разрешён")
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		if r.Method == http.MethodOptions {
			w.Header().Add("Vary", "Access-Control-Request-Method")
			w.Header().Add("Vary", "Access-Control-Request-Headers")
			method := r.Header.Get("Access-Control-Request-Method")
			if origin == "" || (method != "GET" && method != "POST" && method != "PATCH") {
				fail(w, 403, "preflight_forbidden", "Предварительный запрос не разрешён")
				return
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func (s *server) ready(w http.ResponseWriter) bool {
	if s.store == nil {
		fail(w, 503, "database_unavailable", "База данных не подключена")
		return false
	}
	return true
}
func (s *server) options(w http.ResponseWriter, _ *http.Request) {
	if s.catalog == nil {
		fail(w, 503, "rules_unavailable", "Правила не загружены")
		return
	}
	jsonResponse(w, 200, s.catalog)
}
func (s *server) createDraft(w http.ResponseWriter, r *http.Request) {
	if !s.ready(w) {
		return
	}
	d, token, err := s.store.CreateDraft(r.Context(), s.catalog.Rules.ID)
	if err != nil {
		internal(w, err)
		return
	}
	jsonResponse(w, 201, struct {
		storage.Draft
		Token string `json:"token"`
	}{d, token})
}
func draftAuth(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	id := r.PathValue("draftId")
	if !uuidPattern.MatchString(id) {
		fail(w, 404, "not_found", "Черновик не найден")
		return "", "", false
	}
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") || len(strings.TrimPrefix(h, "Bearer ")) != 43 {
		fail(w, 401, "draft_token_required", "Нужен токен черновика")
		return "", "", false
	}
	return id, strings.TrimPrefix(h, "Bearer "), true
}
func storeFailure(w http.ResponseWriter, err error) {
	if errors.Is(err, storage.ErrNotFound) {
		fail(w, 404, "not_found", "Объект не найден")
		return
	}
	internal(w, err)
}
func (s *server) getDraft(w http.ResponseWriter, r *http.Request) {
	id, token, ok := draftAuth(w, r)
	if !ok || !s.ready(w) {
		return
	}
	d, err := s.store.GetDraft(r.Context(), id, token)
	if err != nil {
		storeFailure(w, err)
		return
	}
	jsonResponse(w, 200, d)
}
func (s *server) patchDraft(w http.ResponseWriter, r *http.Request) {
	id, token, ok := draftAuth(w, r)
	if !ok || !s.ready(w) {
		return
	}
	var body struct {
		Section string          `json:"section"`
		Value   json.RawMessage `json:"value"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		fail(w, 400, "invalid_json", "Неверное тело запроса")
		return
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		fail(w, 400, "invalid_json", "Ожидается один JSON-объект")
		return
	}
	switch body.Section {
	case "appearance", "race", "class", "attributes", "abilities", "equipment":
	default:
		fail(w, 400, "invalid_section", "Неизвестный раздел анкеты")
		return
	}
	var value map[string]json.RawMessage
	if json.Unmarshal(body.Value, &value) != nil || value == nil {
		fail(w, 400, "invalid_value", "Значение раздела должно быть объектом")
		return
	}
	d, err := s.store.PatchDraft(r.Context(), id, token, body.Section, body.Value)
	if err != nil {
		storeFailure(w, err)
		return
	}
	jsonResponse(w, 200, d)
}
func (s *server) verifyDraft(w http.ResponseWriter, r *http.Request) bool {
	id, token, ok := draftAuth(w, r)
	if !ok || !s.ready(w) {
		return false
	}
	_, err := s.store.GetDraft(r.Context(), id, token)
	if err != nil {
		storeFailure(w, err)
		return false
	}
	return true
}
func (s *server) advice(w http.ResponseWriter, r *http.Request) {
	if !s.verifyDraft(w, r) {
		return
	}
	fail(w, 503, "advisor_unavailable", "Советник AI Studio ещё не подключён")
}
func (s *server) assets(w http.ResponseWriter, r *http.Request) {
	if !s.verifyDraft(w, r) {
		return
	}
	fail(w, 503, "asset_storage_unavailable", "Хранилище портретов и иконок ещё не подключено")
}
func (s *server) validateDraft(w http.ResponseWriter, r *http.Request) {
	id, token, ok := draftAuth(w, r)
	if !ok || !s.ready(w) {
		return
	}
	d, err := s.store.GetDraft(r.Context(), id, token)
	if err != nil {
		storeFailure(w, err)
		return
	}
	v, _ := s.catalog.Validate(d.FormData)
	jsonResponse(w, 200, v)
}
func (s *server) completeDraft(w http.ResponseWriter, r *http.Request) {
	id, token, ok := draftAuth(w, r)
	if !ok || !s.ready(w) {
		return
	}
	ch, v, err := s.store.Complete(r.Context(), id, token, s.catalog)
	if err != nil {
		storeFailure(w, err)
		return
	}
	if !v.Valid {
		jsonResponse(w, 422, v)
		return
	}
	jsonResponse(w, 201, ch)
}
func (s *server) listCharacters(w http.ResponseWriter, r *http.Request) {
	if !s.ready(w) {
		return
	}
	limit, offset := 20, 0
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 100 {
			fail(w, 400, "invalid_limit", "limit должен быть от 1 до 100")
			return
		}
		limit = n
	}
	if raw := r.URL.Query().Get("offset"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 0 {
			fail(w, 400, "invalid_offset", "offset должен быть неотрицательным")
			return
		}
		offset = n
	}
	items, err := s.store.ListCharacters(r.Context(), limit, offset)
	if err != nil {
		internal(w, err)
		return
	}
	jsonResponse(w, 200, map[string]any{"items": items})
}
func (s *server) getCharacter(w http.ResponseWriter, r *http.Request) {
	if !s.ready(w) {
		return
	}
	id := r.PathValue("characterId")
	if !uuidPattern.MatchString(id) {
		fail(w, 404, "not_found", "Персонаж не найден")
		return
	}
	ch, err := s.store.GetCharacter(r.Context(), id)
	if err != nil {
		storeFailure(w, err)
		return
	}
	jsonResponse(w, 200, ch)
}
func main() {
	contentDir := os.Getenv("CONTENT_DIR")
	if contentDir == "" {
		contentDir = "../content"
	}
	catalog, err := creator.Load(contentDir)
	if err != nil {
		log.Fatalf("load creator rules: %v", err)
	}
	dbURL, err := databaseURL(os.Getenv)
	if err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	st, err := storage.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect database failed (%T)", err)
	}
	defer st.Pool.Close()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	srv := &http.Server{Addr: ":" + port, Handler: newHandler(catalog, st, strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",")), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second}
	log.Printf("API listening on %s", srv.Addr)
	log.Fatal(srv.ListenAndServe())
}
