import {useState} from 'react';
import type {
  CampaignOutfitBuilder,
  CampaignOutfitCategoryId,
  CampaignOutfitOption,
} from '../../../../entities/campaign-session/model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './AlexisOutfitBuilder.module.css';

export type AlexisOutfitSelections = Record<CampaignOutfitCategoryId, string | null>;
export type AlexisOutfitOffsets = Record<CampaignOutfitCategoryId, number>;

interface AlexisOutfitBuilderProps {
  collection: CampaignOutfitBuilder;
  mode: 'builder' | 'room';
  offsets: AlexisOutfitOffsets;
  selections: AlexisOutfitSelections;
  onOffsetChange?: (categoryId: CampaignOutfitCategoryId, offset: number) => void;
  onSelect?: (categoryId: CampaignOutfitCategoryId, optionId: string | null) => void;
}

function findSelectedOption(
  collection: CampaignOutfitBuilder,
  categoryId: CampaignOutfitCategoryId,
  optionId: string | null,
): CampaignOutfitOption | null {
  if (!optionId) return null;
  return collection.categories
    .find((category) => category.id === categoryId)
    ?.options.find((option) => option.id === optionId) ?? null;
}

export function AlexisOutfitBuilder({
  collection,
  mode,
  offsets,
  selections,
  onOffsetChange,
  onSelect,
}: AlexisOutfitBuilderProps) {
  const [directions, setDirections] = useState<Record<CampaignOutfitCategoryId, 'backward' | 'forward'>>({
    top: 'forward',
    bottom: 'forward',
    accent: 'forward',
  });
  const selectedOptions = collection.categories.flatMap((category) => {
    const option = findSelectedOption(collection, category.id, selections[category.id]);
    return option ? [{categoryId: category.id, option}] : [];
  });

  const shiftRow = (
    categoryId: CampaignOutfitCategoryId,
    currentOffset: number,
    optionCount: number,
    direction: 'backward' | 'forward',
  ) => {
    if (!onOffsetChange || optionCount <= collection.pageSize) return;
    const delta = direction === 'forward' ? 1 : -1;
    const nextOffset = (currentOffset + delta + optionCount) % optionCount;
    setDirections((current) => ({...current, [categoryId]: direction}));
    onOffsetChange(categoryId, nextOffset);
  };

  return (
    <div className={styles.outfitLayer} data-mode={mode}>
      <div className={styles.mannequin} aria-live="polite">
        {selectedOptions.map(({categoryId, option}) => (
          <img
            alt=""
            className={styles.garment}
            data-category={categoryId}
            data-option={option.id}
            key={option.id}
            src={resolveAsset(option.image)}
          />
        ))}
        <span className={styles.selectionSummary}>
          {selectedOptions.length
            ? `На манекене выбрано деталей: ${selectedOptions.length}`
            : 'Манекен пока без выбранной одежды'}
        </span>
      </div>

      {mode === 'builder' ? (
        <div className={styles.carousel} aria-label="Выбор деталей образа">
          {collection.categories.map((category) => {
            const rowOptions = [
              {id: `none-${category.id}`, label: 'Без предмета', image: null},
              ...category.options.map((option) => ({...option, image: option.image as string | null})),
            ];
            const optionCount = rowOptions.length;
            const safeOffset = optionCount ? ((offsets[category.id] % optionCount) + optionCount) % optionCount : 0;
            const visibleOptions = Array.from({length: Math.min(collection.pageSize, optionCount)}, (_, index) =>
              rowOptions[(safeOffset + index) % optionCount]);

            return (
              <div className={styles.carouselRow} data-category={category.id} key={category.id}>
                <button
                  aria-label={`${category.label}: предыдущий предмет`}
                  className={styles.previous}
                  type="button"
                  onClick={() => shiftRow(category.id, safeOffset, optionCount, 'backward')}
                ><span aria-hidden="true">‹</span></button>

                <div
                  className={styles.rowOptions}
                  data-direction={directions[category.id]}
                  key={`${category.id}-${safeOffset}`}
                >
                  {visibleOptions.map((option) => {
                    const isEmpty = option.image === null;
                    const selected = isEmpty
                      ? selections[category.id] === null
                      : selections[category.id] === option.id;
                    return (
                      <button
                        aria-label={`${category.label}: ${option.label}`}
                        aria-pressed={selected}
                        className={styles.option}
                        data-selected={selected || undefined}
                        key={option.id}
                        type="button"
                        onClick={() => onSelect?.(category.id, isEmpty ? null : option.id)}
                      >
                        {option.image ? (
                          <img alt="" src={resolveAsset(option.image)} />
                        ) : (
                          <span className={styles.emptyOption} aria-hidden="true">
                            <b>×</b>
                            <small>Без предмета</small>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  aria-label={`${category.label}: следующий предмет`}
                  className={styles.next}
                  type="button"
                  onClick={() => shiftRow(category.id, safeOffset, optionCount, 'forward')}
                ><span aria-hidden="true">›</span></button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
