import type {CharacterFormController} from '../../../../entities/character-form';
import {AppearanceFields, PortraitGallery} from '../../../../features/edit-character-appearance';
import type {CreatorMedia} from '../../model/useCreatorMedia';

export type AppearanceStepProps = {controller: CharacterFormController; media: CreatorMedia};

export function AppearanceStep({controller, media}: AppearanceStepProps) {
  return (
    <AppearanceFields appearance={controller.appearance} onChange={controller.setAppearance}>
      <PortraitGallery images={media.portraits.images} selectedId={media.selected?.id ?? null}
        onSelect={media.selectPortrait} onRemove={media.portraits.remove} error={media.portraits.error}
        onUpload={(files) => { void media.portraits.addFiles(files); }} />
    </AppearanceFields>
  );
}
