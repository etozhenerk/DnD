package characterapp

import (
	"context"
	"fmt"
	"time"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
	"github.com/etozhenerk/DnD/backend/internal/creator"
	"github.com/etozhenerk/DnD/backend/internal/media"
)

// AdvisorImageModel is the separately configured text-to-image tool.
type AdvisorImageModel interface {
	Generate(context.Context, string, string) ([]byte, error)
}

// AdvisorObjects stores immutable results in the existing private media bucket.
type AdvisorObjects interface {
	Put(context.Context, creator.Asset, []byte) error
	Get(context.Context, creator.Asset) ([]byte, error)
}

// EnableImages is called only while composing the runtime, before requests start.
func (a *Advisor) EnableImages(model AdvisorImageModel, objects AdvisorObjects) {
	a.images, a.objects = model, objects
}

// ImagesEnabled is the public capability flag, not a permission grant.
func (a *Advisor) ImagesEnabled() bool { return a != nil && a.images != nil && a.objects != nil }

func (a *Advisor) makeImage(ctx context.Context, id string, in advisor.Input, messages []advisor.Message) (advisor.Completion, error) {
	writeCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	result, err := a.model.Complete(writeCtx, messages, "image_prompt")
	cancel()
	result.ImagePrompt = true
	if err != nil {
		return result, err
	}
	if _, err := advisor.Cost(result); err != nil {
		return result, nil // finish records invalid usage and blocks the breached monthly envelope.
	}
	prompt, err := advisor.CompileImagePrompt(result.Reply, in.Mode)
	if err != nil || result.Tool != "" {
		result.Reply = "Не сложился образ для рисунка. Добавь пару деталей — попробуем ещё раз."
		return result, nil
	}
	raw, err := a.images.Generate(ctx, prompt, in.Mode)
	if err != nil {
		return result, err
	}
	result.ImageCharge = true
	result.Reply = "Картинка появилась, но подготовить её не удалось. Можно попробовать другой образ."
	data, err := media.NormalizeGenerated(raw, in.Mode == "icon")
	if err != nil {
		return result, nil
	} // The provider call succeeded and must still be accounted.
	file := media.File{Data: data}
	if in.Mode == "icon" {
		file.AbilityID = in.Target
	}
	asset, err := media.Prepare(id, file)
	if err != nil {
		return result, nil
	}
	asset.ObjectKey = "advisor/" + id + "/" + in.RequestID + ".jpg"
	if err := a.objects.Put(ctx, asset, data); err != nil {
		return result, nil
	}
	result.Reply = "Вот что вышло. Нравится — забирай в анкету!"
	result.Asset = &advisor.ImageAsset{ObjectKey: asset.ObjectKey, MIMEType: asset.MIMEType, SHA256: asset.SHA256, SizeBytes: asset.SizeBytes}
	return result, nil
}

// Image reads a private result; it makes no paid call and never accepts a storage URL.
func (a *Advisor) Image(ctx context.Context, id, token, requestID string) ([]byte, string, error) {
	if !advisor.ValidAccess(id, token) || !advisor.ValidAccess(requestID, token) || !a.ImagesEnabled() {
		return nil, "", advisor.ErrNotFound
	}
	store, ok := a.store.(interface {
		GetAdvisorImage(context.Context, string, []byte, string) (advisor.ImageAsset, error)
	})
	if !ok {
		return nil, "", advisor.ErrUnavailable
	}
	asset, err := store.GetAdvisorImage(ctx, id, advisor.TokenHash(token), requestID)
	if err != nil {
		return nil, "", err
	}
	data, err := a.objects.Get(ctx, creator.Asset{ObjectKey: asset.ObjectKey, MIMEType: asset.MIMEType, SHA256: asset.SHA256, SizeBytes: asset.SizeBytes})
	if err != nil {
		return nil, "", fmt.Errorf("read advisor image: %w", err)
	}
	return data, asset.MIMEType, nil
}
