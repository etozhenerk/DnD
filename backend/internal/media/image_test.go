package media

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"
)

func pngBytes(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	img.Set(0, 0, color.NRGBA{R: 220, A: 70})
	var b bytes.Buffer
	if err := png.Encode(&b, img); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func TestImageLimitsAndContent(t *testing.T) {
	for _, tt := range []struct {
		name    string
		file    File
		invalid bool
	}{
		{"portrait", File{Data: pngBytes(t, 1600, 900)}, false},
		{"transparent icon", File{AbilityID: "fire", Data: pngBytes(t, 512, 200)}, false},
		{"oversized dimension", File{Data: pngBytes(t, 1601, 1)}, true},
		{"oversized icon", File{AbilityID: "fire", Data: pngBytes(t, 513, 1)}, true},
		{"svg", File{Data: []byte(`<svg width="1" height="1"/>`)}, true},
		{"truncated PNG", File{Data: pngBytes(t, 12, 12)[:30]}, true},
		{"too many bytes", File{Data: make([]byte, PortraitLimit+1)}, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			a, err := Prepare("6daa09af-bd77-48a9-971e-6ae1b9a49fce", tt.file)
			if tt.invalid {
				if !errors.Is(err, ErrInvalidImage) {
					t.Fatalf("got %v", err)
				}
				return
			}
			if err != nil || a.SizeBytes != int64(len(tt.file.Data)) || a.MIMEType != "image/png" {
				t.Fatalf("invalid result: %+v %v", a, err)
			}
		})
	}
}

func TestImageIdentityPreservesRetryAndDistinguishesOwners(t *testing.T) {
	f := File{Data: pngBytes(t, 4, 4)}
	a, _ := Prepare("owner-a", f)
	b, _ := Prepare("owner-a", f)
	c, _ := Prepare("owner-b", f)
	d, _ := Prepare("owner-a", File{AbilityID: "fire", Data: f.Data})
	if a != b || a.ID == c.ID || a.ID == d.ID {
		t.Fatal("file identity is unstable or reused between owners/kinds")
	}
}

func TestPreparedJPEGIsSupported(t *testing.T) {
	var b bytes.Buffer
	if err := jpeg.Encode(&b, image.NewRGBA(image.Rect(0, 0, 120, 80)), nil); err != nil {
		t.Fatal(err)
	}
	a, err := Prepare("owner", File{Data: b.Bytes()})
	if err != nil || a.MIMEType != "image/jpeg" {
		t.Fatalf("got %+v %v", a, err)
	}
}
