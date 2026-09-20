import partyRewards from '../../../../../content/party-rewards.json';
import {createPartyRewardInventory} from '../../../../entities/campaign-session/model/partyRewards';
import {toCampaignInspectableId} from '../../../../entities/campaign-session/model/inventoryPresentation';
import {olvaQuest} from '../../../../entities/campaign-session/model/olvaQuest';
import {useEffect, useMemo, useState} from 'react';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import type {GalleryGameplayDefinition} from '../../../../entities/campaign-session/model/galleryGameplay';
import {getGmCampaignItemCatalogue, parseGmInteger} from '../../model/gmConsolePresentation';
import styles from './GameMasterConsole.module.css';

interface InventoryEditorProps {
  campaignScenes: CampaignSessionScene[];
  controller: GallerySessionController;
  definition: GalleryGameplayDefinition;
}

export function InventoryEditor({campaignScenes, controller}: InventoryEditorProps) {
  const {state} = controller;
  const knownItems = useMemo(() => getGmCampaignItemCatalogue(campaignScenes, state), [campaignScenes, state]);
  const [itemId, setItemId] = useState(knownItems.find(item => state.inventory.includes(item.id))?.id ?? knownItems[0]?.id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [charges, setCharges] = useState('0');
  const [status, setStatus] = useState('');
  const undoRevision = state.events.filter(event => event.type === 'action-corrected').length;
  useEffect(() => setStatus(''), [undoRevision]);
  const itemState = state.inventoryState[itemId];
  const acquiredItems = knownItems.filter(item => state.inventory.includes(item.id));
  const acquired = state.inventory.includes(itemId);
  const itemName = knownItems.find(item => item.id === itemId)?.label ?? itemId;
  const initialItem = state.initialInventoryState[itemId] ?? createPartyRewardInventory(itemId);
  const maxCharges = itemState?.maxCharges ?? initialItem?.maxCharges ?? null;
  const description = campaignScenes.flatMap(scene => scene.inspectables).find(item => item.id === toCampaignInspectableId(itemId))?.summary ?? partyRewards.find(item => item.id === itemId)?.description;
  const validQuantity = parseGmInteger(quantity, 1, 99);
  const validCharges = parseGmInteger(charges, 0, maxCharges ?? 99);

  useEffect(() => {
    setQuantity(String(itemState?.quantity ?? 1));
    setCharges(String(itemState?.charges ?? state.itemCharges[itemId] ?? initialItem?.charges ?? 0));
  }, [itemId, itemState?.charges, itemState?.ownerId, itemState?.quantity, state.itemCharges]);

  const saveItem = () => {
    if (!knownItems.some(item => item.id === itemId) || validQuantity === null || (maxCharges !== null && validCharges === null)) return;
    const saved = controller.manualSetInventoryItem({
      itemId,
      acquired: true,
      ownerId: null,
      quantity: validQuantity,
      charges: maxCharges === null ? 0 : validCharges!,
    });
    setStatus(saved ? `«${itemName}» — общая сумка.` : 'Укажите целое количество и допустимые заряды.');
  };

  const removeItem = () => {
    const saved = controller.manualSetInventoryItem({
      itemId,
      acquired: false,
      ownerId: null,
      quantity: 0,
      charges: 0,
    });
    setStatus(saved ? `«${itemName}» убран.` : 'Предмет не удалён.');
  };

  return (
    <section className={styles.section} aria-labelledby="gm-inventory-heading">
      <div className={styles.sectionHeading}>
        <div><p>Предметы кампании, количество и заряды</p><h3 id="gm-inventory-heading">Общая сумка</h3></div>
        <span>{acquiredItems.length} поз.</span>
      </div>
      <p className={styles.note}>Выберите предмет из кампании — он появится в общей сумке наверху экрана, в ближайшей свободной ячейке. Добавление или удаление здесь меняет только инвентарь — сюжетные награды и двери проходят через свои сцены.</p>
      {itemId === olvaQuest.reward.id && acquired ? <div className={styles.actionRow}>
        <p>{olvaQuest.reward.effect}</p>
        <p className={styles.note}>Для применения закройте консоль и нажмите карточку в общей сумке: там можно ввести или бросить d8 для каждого героя.</p>
      </div> : null}
      <div className={styles.formGrid}>
        <label>
          Предмет
          <select value={itemId} onChange={event => setItemId(event.target.value)}>
            <optgroup label="Уже у группы">{knownItems.filter(item => state.inventory.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>
            <optgroup label="Добавить из кампании">{knownItems.filter(item => !state.inventory.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>
          </select>
        </label>
        <label>
          Количество
          <input inputMode="numeric" min="1" max="99" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </label>
        <label>
          Заряды
          <input disabled={maxCharges === null} inputMode="numeric" min="0" max={maxCharges ?? 99} type="number" value={maxCharges === null ? '0' : charges} onChange={(event) => setCharges(event.target.value)} />
        </label>
      </div>
      <p className={styles.note}>{description}</p>
      <p className={styles.note}>{maxCharges === null ? 'У этого предмета нет расходуемых зарядов.' : `Заряды — оставшиеся применения: от 0 до ${maxCharges}. Ноль зарядов оставляет предмет в сумке.`} Чтобы удалить предмет целиком, нажмите «Убрать».</p>
      <div className={styles.actionRow}>
        <button disabled={!itemId || validQuantity === null || (maxCharges !== null && validCharges === null)} type="button" onClick={saveItem}>{acquired ? 'Сохранить в общей сумке' : 'Положить в общую сумку'}</button>
        <button disabled={!acquired} type="button" onClick={removeItem}>Убрать</button>
      </div>
      <details className={styles.disclosure}><summary>В общей сумке ({acquiredItems.length})</summary>
      {acquiredItems.length ? (
        <ul className={styles.inventoryList}>
          {acquiredItems.map(({id}) => {
            const details = state.inventoryState[id];
            const label = knownItems.find((item) => item.id === id)?.label ?? id;
            const chargeLabel = details?.maxCharges === null
              ? 'без зарядов'
              : `${details?.charges ?? state.itemCharges[id] ?? 0}/${details?.maxCharges ?? '?'} зар.`;
            return (
              <li key={id}>
                <button type="button" onClick={() => setItemId(id)}>{label}</button>
                <span>{details?.quantity ?? 1} шт. · {chargeLabel}</span>
              </li>
            );
          })}
        </ul>
      ) : <p className={styles.note}>Инвентарь сессии пуст.</p>}
      </details>
      <p className={styles.liveStatus} aria-live="polite">{status}</p>
    </section>
  );
}
