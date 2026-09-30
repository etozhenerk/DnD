package abilities

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"regexp"
)

var slug = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// Decode accepts partial forms, but rejects unknown fields and invalid JSON types.
func Decode(raw json.RawMessage) (Section, error) {
	var s Section
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '{' {
		return s, errors.New("ability section must be an object")
	}
	d := json.NewDecoder(bytes.NewReader(trimmed))
	d.DisallowUnknownFields()
	if err := d.Decode(&s); err != nil {
		return s, err
	}
	var extra any
	if err := d.Decode(&extra); !errors.Is(err, io.EOF) {
		return s, errors.New("ability section must contain one object")
	}
	// encoding/json accepts null for strings and structs; the HTTP contract does not.
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(trimmed, &fields); err != nil {
		return s, err
	}
	for key, value := range fields {
		if bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
			return s, errors.New("ability section fields cannot be null: " + key)
		}
	}
	return s, rejectNullValues(fields)
}

func rejectNullValues(fields map[string]json.RawMessage) error {
	for key, raw := range fields {
		objects := []map[string]json.RawMessage{}
		if key == "basicAction" {
			var object map[string]json.RawMessage
			if err := json.Unmarshal(raw, &object); err != nil {
				return err
			}
			objects = append(objects, object)
		} else if err := json.Unmarshal(raw, &objects); err != nil {
			return err
		}
		for _, object := range objects {
			if object == nil {
				return errors.New("ability entries cannot be null")
			}
			for field, value := range object {
				if field != "iconAssetId" && bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
					return errors.New("ability field cannot be null: " + field)
				}
			}
		}
	}
	return nil
}
