import type {CharacterFormController} from '../../../../entities/character-form';
import type {CreatorStep} from '../../config/creator-steps';
import type {CreatorMedia} from '../../model/useCreatorMedia';
import {AppearanceStep} from '../AppearanceStep';
import {RaceStep} from '../RaceStep';
import {ClassStep} from '../ClassStep';
import {AttributeStep} from '../AttributeStep';
import {SkillsStep} from '../SkillsStep';
import {EquipmentStep} from '../EquipmentStep';
import {ReviewStep} from '../ReviewStep';

export type CreatorStepBodyProps = {step: CreatorStep; controller: CharacterFormController; media: CreatorMedia};

export function CreatorStepBody({step, controller, media}: CreatorStepBodyProps) {
  switch (step.id) {
    case 'appearance': return <AppearanceStep controller={controller} media={media} />;
    case 'race': return <RaceStep controller={controller} />;
    case 'class': return <ClassStep controller={controller} />;
    case 'attributes': return <AttributeStep controller={controller} />;
    case 'abilities': return <SkillsStep controller={controller} media={media} />;
    case 'equipment': return <EquipmentStep controller={controller} />;
    case 'review': return <ReviewStep controller={controller} />;
  }
}
