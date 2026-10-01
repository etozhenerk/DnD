package creator

import "errors"

// ErrAssetNotFound hides missing, unverified and unlinked files behind one result.
var ErrAssetNotFound = errors.New("asset not found")

// Asset contains verified metadata for a file owned by a ready character.
// It is persisted separately and never returned as part of the public card.
type Asset struct {
	ID, Kind, ObjectKey, MIMEType, SHA256 string
	SizeBytes                             int64
}

// AssetURL is stable because images are immutable after anonymous creation.
func AssetURL(id string) string {
	if id == "" {
		return ""
	}
	return "/assets/" + id
}
