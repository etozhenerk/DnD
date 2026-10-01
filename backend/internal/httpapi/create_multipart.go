package httpapi

import (
	"bytes"
	"errors"
	"io"
	"mime"
	"net/http"
	"regexp"
	"strings"

	"github.com/etozhenerk/DnD/backend/internal/characterapp"
	"github.com/etozhenerk/DnD/backend/internal/media"
)

var iconPart = regexp.MustCompile(`^icon:([a-z0-9]+(-[a-z0-9]+)*)$`)

func decodeCreationRequest(w http.ResponseWriter, r *http.Request) (characterapp.CreateInput, error) {
	typeName, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil {
		return characterapp.CreateInput{}, err
	}
	if typeName == "application/json" {
		return decodeCreation(w, r)
	}
	if typeName != "multipart/form-data" {
		return characterapp.CreateInput{}, errors.New("unsupported content type")
	}
	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)
	reader, err := r.MultipartReader()
	if err != nil {
		return characterapp.CreateInput{}, err
	}
	seen := map[string]bool{}
	var input characterapp.CreateInput
	var files []media.File
	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return input, err
		}
		name := part.FormName()
		limit := 256 << 10
		if name == "portrait" {
			limit = media.PortraitLimit
		} else if iconPart.MatchString(name) {
			limit = media.IconLimit
		} else if name != "character" {
			return input, errors.New("unknown multipart part")
		}
		if seen[name] || len(seen) >= 5 {
			return input, errors.New("duplicate or excess multipart part")
		}
		seen[name] = true
		data, err := io.ReadAll(io.LimitReader(part, int64(limit+1)))
		part.Close()
		if err != nil {
			return input, err
		}
		if len(data) > limit {
			return input, &http.MaxBytesError{Limit: int64(limit)}
		}
		if name == "character" {
			copyRequest := r.Clone(r.Context())
			copyRequest.Body = io.NopCloser(bytes.NewReader(data))
			input, err = decodeCreation(w, copyRequest)
			if err != nil {
				return input, err
			}
		} else {
			abilityID := ""
			if name != "portrait" {
				abilityID = strings.TrimPrefix(name, "icon:")
			}
			files = append(files, media.File{AbilityID: abilityID, Data: data})
		}
	}
	if _, err := io.Copy(io.Discard, r.Body); err != nil {
		return input, err
	}
	if !seen["character"] {
		return input, errors.New("missing character JSON")
	}
	input.Files = files
	return input, nil
}
