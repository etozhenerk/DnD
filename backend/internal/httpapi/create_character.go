package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"mime"
	"net/http"

	"github.com/etozhenerk/DnD/backend/internal/characterapp"
	"github.com/etozhenerk/DnD/backend/internal/creator"
)

// CreateCharacterHandler exposes anonymous whole-form creation without draft access.
func CreateCharacterHandler(catalog *creator.Catalog, writer characterapp.CharacterWriter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if catalog == nil || writer == nil {
			writeCreationError(w, http.StatusServiceUnavailable, "creation_unavailable", "Сохранение персонажей временно недоступно.")
			return
		}
		mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if err != nil || mediaType != "application/json" {
			writeCreationError(w, http.StatusBadRequest, "invalid_json", "Отправьте анкету в формате JSON.")
			return
		}
		input, err := decodeCreation(w, r)
		if err != nil {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				writeCreationError(w, http.StatusRequestEntityTooLarge, "request_too_large", "Анкета превышает 256 КиБ.")
				return
			}
			writeCreationError(w, http.StatusBadRequest, "invalid_json", "Неверная структура анкеты или неподдержанное поле.")
			return
		}
		result, err := characterapp.NewCreator(catalog, writer).Create(r.Context(), input)
		if errors.Is(err, creator.ErrCreationConflict) {
			writeCreationError(w, http.StatusConflict, "creation_conflict", "Эта попытка сохранения уже использована для другой анкеты.")
			return
		}
		if err != nil {
			slog.Error("character creation failed", "error_type", fmt.Sprintf("%T", err))
			writeCreationError(w, http.StatusInternalServerError, "internal_error", "Не удалось сохранить героя. Повторите попытку.")
			return
		}
		if !result.Validation.Valid {
			writeCreationJSON(w, http.StatusUnprocessableEntity, result.Validation)
			return
		}
		status := http.StatusOK
		if result.Created {
			status = http.StatusCreated
		}
		w.Header().Set("Location", "/characters/"+result.Character.ID)
		writeCreationJSON(w, status, result.Character)
	}
}

func writeCreationError(w http.ResponseWriter, status int, code, message string) {
	writeCreationJSON(w, status, struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}{Code: code, Message: message})
}

func writeCreationJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		slog.Warn("write creation response failed", "error_type", fmt.Sprintf("%T", err))
	}
}
