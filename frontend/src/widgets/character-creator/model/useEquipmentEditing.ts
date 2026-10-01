import type {CharacterFormController, EquipmentItem} from '../../../entities/character-form';

export function useEquipmentEditing(controller: CharacterFormController) {
  const items = controller.formData.equipment?.items ?? [];
  const update = (value: EquipmentItem[]) => controller.setSection('equipment', {items: value});
  return {
    items,
    add: () => {
      if (items.length >= 20) return;
      update([...items, {id: 'item-' + crypto.randomUUID(), name: '', description: ''}]);
    },
    change: (item: EquipmentItem) => update(items.map((current) => current.id === item.id ? item : current)),
    remove: (id: string) => update(items.filter((item) => item.id !== id)),
    confirm: () => { update(items); controller.confirmSection('equipment'); },
  };
}
