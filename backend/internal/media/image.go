package media

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"

	"github.com/etozhenerk/DnD/backend/internal/creator"
)

// PortraitLimit bounds one prepared portrait in bytes.
const PortraitLimit = 1 << 20

// IconLimit bounds one prepared skill icon in bytes.
const IconLimit = 128 << 10

// ErrInvalidImage indicates unsupported, oversized or damaged image content.
var ErrInvalidImage = errors.New("invalid image")

// File carries binary content, never a client-selected storage key or URL.
type File struct {
	AbilityID string
	Data      []byte
}

// Prepare checks decoded content and bounds memory before allocating image pixels.
func Prepare(characterID string, file File) (creator.Asset, error) {
	kind, limit, edge := "portrait", PortraitLimit, 1600
	if file.AbilityID != "" {
		kind, limit, edge = "ability_icon", IconLimit, 512
	}
	if len(file.Data) == 0 || len(file.Data) > limit {
		return creator.Asset{}, ErrInvalidImage
	}
	config, format, err := image.DecodeConfig(bytes.NewReader(file.Data))
	if err != nil || (format != "png" && format != "jpeg") || config.Width < 1 || config.Height < 1 || config.Width > edge || config.Height > edge {
		return creator.Asset{}, ErrInvalidImage
	}
	if _, _, err := image.Decode(bytes.NewReader(file.Data)); err != nil {
		return creator.Asset{}, ErrInvalidImage
	}
	hash := sha256.Sum256(file.Data)
	digest := hex.EncodeToString(hash[:])
	identity := sha256.Sum256([]byte(characterID + ":" + kind + ":" + file.AbilityID + ":" + digest))
	identity[6] = (identity[6] & 0x0f) | 0x50
	identity[8] = (identity[8] & 0x3f) | 0x80
	id := fmt.Sprintf("%x-%x-%x-%x-%x", identity[:4], identity[4:6], identity[6:8], identity[8:10], identity[10:16])
	extension := "png"
	if format == "jpeg" {
		extension = "jpg"
	}
	return creator.Asset{ID: id, Kind: kind, ObjectKey: "characters/" + characterID + "/" + id + "." + extension,
		MIMEType: "image/" + format, SizeBytes: int64(len(file.Data)), SHA256: digest}, nil
}
