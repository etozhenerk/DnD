import {useEffect, useState} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatActionView} from './combatTypes';
import styles from './CombatActionTray.module.css';

interface CombatActionTrayProps {
  actions: CombatActionView[];
  activeId: string;
  activeName: string;
  equippedItemId: string;
  onEquipItem: (actionId: string | null) => void;
  onSelectAction: (actionId: string) => void;
  selectedActionIds: string[];
}

const abilityIcon = 'assets/concepts/ui/hero-book-icon-attack.png';
const itemIcon = 'assets/concepts/ui/hero-book-icon-hp.png';
const inventoryIcon = 'assets/concepts/campaigns/penisuela/ui/inventory-bag-icon.png';

export function CombatActionTray({
  actions,
  activeId,
  activeName,
  equippedItemId,
  onEquipItem,
  onSelectAction,
  selectedActionIds,
}: CombatActionTrayProps) {
  const [itemsOpen, setItemsOpen] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const abilities = actions.filter((action) => action.source === 'ability');
  const items = actions.filter((action) => action.source === 'item');
  const equippedItem = items.find((item) => item.id === equippedItemId);
  const previewItem = items.find((item) => item.id === previewItemId) ?? equippedItem ?? items[0];

  const openItems = (itemId?: string) => {
    setPreviewItemId(itemId ?? equippedItem?.id ?? items[0]?.id ?? null);
    setItemsOpen(true);
  };

  useEffect(() => {
    setItemsOpen(false);
    setPreviewItemId(null);
  }, [activeId]);
  useEffect(() => {
    if (!itemsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setItemsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [itemsOpen]);

  return (
    <section className={styles.tray} aria-label="Умения и предметы">
      <div className={styles.heading}>
        <strong>Навык + предмет</strong>
        <span />
        <button
          className={styles.itemsToggle}
          type="button"
          aria-expanded={itemsOpen}
          aria-controls="combat-items-menu"
          onClick={() => itemsOpen ? setItemsOpen(false) : openItems()}
          title="Открыть предметы"
        >
          <img src={resolveAsset(inventoryIcon)} alt="" />
          <span>Предметы</span>
        </button>
      </div>

      <div className={styles.actionList}>
        {abilities.map((action) => (
          <button
            className={`${styles.action} ${selectedActionIds.includes(action.id) ? styles.selectedAction : ''}`}
            type="button"
            key={action.id}
            disabled={action.disabled}
            aria-pressed={selectedActionIds.includes(action.id)}
            onClick={() => onSelectAction(action.id)}
            title={`${action.name}. ${action.description}`}
            aria-label={`${action.name}. ${action.description}. ${selectedActionIds.includes(action.id) ? 'Выбран для следующей атаки' : action.disabledReason ?? `Доступен, использовано ${action.uses} из ${action.maxUses}`}`}
          >
            <img src={resolveAsset(abilityIcon)} alt="" />
            <span>
              <strong>{action.name}</strong>
              <small>{action.effectLabel}</small>
            </span>
            <em>{selectedActionIds.includes(action.id) ? 'Выбран' : action.disabledReason ?? 'Выбрать'}</em>
          </button>
        ))}
        {equippedItem ? (
          <button
            className={`${styles.action} ${selectedActionIds.includes(equippedItem.id) ? styles.selectedAction : ''}`}
            type="button"
            disabled={equippedItem.disabled}
            aria-pressed={selectedActionIds.includes(equippedItem.id)}
            onClick={() => onSelectAction(equippedItem.id)}
            title={`${equippedItem.name}. ${equippedItem.description}`}
            aria-label={`${equippedItem.name}. ${equippedItem.description}. ${equippedItem.effectLabel}. Выбрать действие`}
          >
            <img src={resolveAsset(itemIcon)} alt="" />
            <span><strong>{equippedItem.name}</strong><small>{equippedItem.effectLabel}</small></span>
            <em>{equippedItem.disabledReason
              ?? (selectedActionIds.includes(equippedItem.id) ? 'Выбран' : equippedItem.attackModifier ? 'К атаке' : 'Действие')}</em>
          </button>
        ) : (
          <button
            className={`${styles.action} ${styles.emptyItem}`}
            type="button"
            onClick={() => openItems()}
            aria-label="Выбрать предмет для боя"
          >
            <img src={resolveAsset(inventoryIcon)} alt="" />
            <span><strong>Выбрать предмет</strong><small>Ничего не экипировано</small></span>
            <em>+</em>
          </button>
        )}
      </div>

      {itemsOpen ? (
        <aside className={styles.itemsMenu} id="combat-items-menu" aria-label={`Предметы: ${activeName}`}>
          <div className={styles.itemsMenuHeading}>
            <div><span>Снаряжение</span><strong>{activeName}</strong></div>
            <button type="button" onClick={() => setItemsOpen(false)} aria-label="Закрыть предметы">×</button>
          </div>
          <div className={styles.itemChoices}>
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={item.id === previewItem?.id}
                onClick={() => setPreviewItemId(item.id)}
                title={item.description}
              >
                <img src={resolveAsset(itemIcon)} alt="" />
                <span><strong>{item.name}</strong><small>{item.id === equippedItemId ? 'Выбран для боя' : 'Посмотреть описание'}</small></span>
                <em>{item.uses}/{item.maxUses}</em>
              </button>
            ))}
          </div>
          {previewItem ? (
            <section className={styles.itemPreview} aria-label={`Описание предмета: ${previewItem.name}`}>
              <div><strong>{previewItem.name}</strong><small>{previewItem.uses}/{previewItem.maxUses} использований</small></div>
              <p>{previewItem.description}</p>
              <b>{previewItem.effectLabel}</b>
              <div className={styles.itemPreviewActions}>
                {previewItem.id !== equippedItemId ? (
                  <button type="button" onClick={() => {
                    onEquipItem(previewItem.id);
                    setItemsOpen(false);
                  }}>Выбрать предмет</button>
                ) : <span>Предмет выбран</span>}
                {previewItem.id === equippedItemId ? (
                  <button type="button" onClick={() => onEquipItem(null)}>Снять</button>
                ) : null}
              </div>
            </section>
          ) : <p>У этого героя нет доступных предметов.</p>}
        </aside>
      ) : null}
    </section>
  );
}
