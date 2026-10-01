import {classProfiles} from '../../../../entities/character-form';
import type {CharacterFormController} from '../../../../entities/character-form';
import {ConfirmDialog} from '../../../../shared/ui/ConfirmDialog';

export type ClassChangeConfirmationProps = {controller: CharacterFormController};

export function ClassChangeConfirmation({controller}: ClassChangeConfirmationProps) {
  const profile = classProfiles.find((item) => item.id === controller.pendingClassId);
  if (!profile) return null;
  return <ConfirmDialog title={'Выбрать класс «' + profile.name + '»?'}
    description="Основа характеристик изменится, а выбранные усиления сбросятся. После смены класса вы распределите дополнительные очки заново."
    confirmLabel="Сменить класс" onConfirm={controller.confirmClassChange} onCancel={controller.cancelClassChange} />;
}
