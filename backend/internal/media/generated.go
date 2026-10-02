package media

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
)

// NormalizeGenerated preserves the whole image and prepares the existing upload limits.
// This resizes and encodes; it never removes backgrounds or changes alpha masks.
func NormalizeGenerated(data []byte, icon bool) ([]byte, error) {
	config, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || (format != "jpeg" && format != "png") || config.Width < 1 || config.Height < 1 || config.Width > 1600 || config.Height > 1600 {
		return nil, ErrInvalidImage
	}
	source, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, ErrInvalidImage
	}
	limit := PortraitLimit
	if icon {
		limit = IconLimit
		source = resizeGenerated(source, 512)
	}
	for _, quality := range []int{90, 80, 65, 50} {
		var out bytes.Buffer
		if err := jpeg.Encode(&out, source, &jpeg.Options{Quality: quality}); err != nil {
			return nil, err
		}
		if out.Len() <= limit {
			return out.Bytes(), nil
		}
	}
	return nil, ErrInvalidImage
}

func resizeGenerated(source image.Image, maximum int) image.Image {
	b := source.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= maximum && h <= maximum {
		return source
	}
	if w >= h {
		h = h * maximum / w
		w = maximum
	} else {
		w = w * maximum / h
		h = maximum
	}
	if w < 1 {
		w = 1
	}
	if h < 1 {
		h = 1
	}
	out := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			left, right := x*b.Dx()/w, (x+1)*b.Dx()/w
			top, bottom := y*b.Dy()/h, (y+1)*b.Dy()/h
			var r, g, blue, a, n uint64
			for sy := top; sy < bottom; sy++ {
				for sx := left; sx < right; sx++ {
					c := color.NRGBAModel.Convert(source.At(b.Min.X+sx, b.Min.Y+sy)).(color.NRGBA)
					r += uint64(c.R)
					g += uint64(c.G)
					blue += uint64(c.B)
					a += uint64(c.A)
					n++
				}
			}
			out.SetNRGBA(x, y, color.NRGBA{R: uint8(r / n), G: uint8(g / n), B: uint8(blue / n), A: uint8(a / n)})
		}
	}
	return out
}
