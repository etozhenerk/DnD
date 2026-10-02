package media

import (
	"bytes"
	"image"
	"image/png"
	"testing"
)

func TestGeneratedImagesPreserveAspectAndRespectUploadLimits(t *testing.T) {
	for _, tc := range []struct {
		name                         string
		width, height                int
		icon                         bool
		wantWidth, wantHeight, limit int
	}{
		{"portrait", 1024, 1536, false, 1024, 1536, PortraitLimit},
		{"wide icon", 1024, 512, true, 512, 256, IconLimit},
		{"thin icon", 1, 1024, true, 1, 512, IconLimit},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var source bytes.Buffer
			if err := png.Encode(&source, image.NewRGBA(image.Rect(0, 0, tc.width, tc.height))); err != nil {
				t.Fatal(err)
			}
			data, err := NormalizeGenerated(source.Bytes(), tc.icon)
			if err != nil || len(data) > tc.limit {
				t.Fatalf("bytes=%d err=%v", len(data), err)
			}
			config, format, err := image.DecodeConfig(bytes.NewReader(data))
			if err != nil || format != "jpeg" || config.Width != tc.wantWidth || config.Height != tc.wantHeight {
				t.Fatalf("config=%+v format=%s err=%v", config, format, err)
			}
		})
	}
	for _, bad := range [][]byte{nil, []byte("not an image")} {
		if _, err := NormalizeGenerated(bad, true); err == nil {
			t.Fatal("accepted damaged image")
		}
	}
}
