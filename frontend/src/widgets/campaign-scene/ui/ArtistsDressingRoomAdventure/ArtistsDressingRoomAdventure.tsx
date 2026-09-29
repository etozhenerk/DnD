import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
} from '../../../../entities/campaign-session/model/playableData';
import type {HeroStat} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import type {SceneMasterAction} from '../../../../features/navigate-campaign-scene/ui/SceneMasterControl/SceneMasterControl';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {useManualCriticalRollEffect} from '../../../../shared/lib/dice/useManualCriticalRollEffect';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import styles from './ArtistsDressingRoomAdventure.module.css';

interface ArtistsDressingRoomAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

const statLabels: Record<HeroStat, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  wisdom: 'Мудрость',
  intelligence: 'Интеллект',
  charisma: 'Харизма',
};

const dressingCheckIds = new Set([
  'identify-secret-artist',
  'read-mask-route',
  'free-satyr-window',
  'finish-dressing-rehearsal',
  'align-stage-power',
  'hold-stage-lever',
]);

const stageModuleCheckIds = new Set([
  'align-stage-power',
  'hold-stage-lever',
]);

function isValidD20(value: string) {
  const roll = Number(value);
  return Number.isInteger(roll) && roll >= 1 && roll <= 20;
}

export function ArtistsDressingRoomAdventure({
  campaignId,
  campaignScenes,
  scene,
}: ArtistsDressingRoomAdventureProps) {
  const dressingRoom = penisuelaGalleryGameplay.dressingRoom;
  const legacySceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(
    penisuelaGalleryGameplay,
    penisuelaGalleryHeroes,
    legacySceneIds,
  );
  const {state} = controller;
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
  const [activeHeroId, setActiveHeroId] = useState<string | null>(null);
  const [activeStat, setActiveStat] = useState<HeroStat | null>(null);
  const [physicalRoll, setPhysicalRoll] = useState('');
  const [isDieRolling, setIsDieRolling] = useState(false);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const [dieRollRequestId, setDieRollRequestId] = useState(0);
  const [diceError, setDiceError] = useState(false);
  const {commitManualRoll, markManualRoll, resetManualRoll} = useManualCriticalRollEffect();
  const isStageModuleScene = scene.id === 'stage-module-shutdown';
  const stageModuleAvailable = Boolean(state.flags['dressing-doubles-disabled']);
  const stageModuleDisabled = Boolean(state.flags['stage-module-disabled']);
  const artistClueCount = dressingRoom.objects
    .filter((item) => item.group === 'artist')
    .filter((item) => state.flags[`dressing-object-${item.id}-inspected`])
    .length;
  const routeObjectsReady = Boolean(
    state.flags['dressing-object-transfer-log-inspected']
    && state.flags['dressing-object-route-mirror-inspected'],
  );
  const selectedObject = dressingRoom.objects.find((item) => item.id === selectedObjectId);
  const activeCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === activeCheckId);
  const activeHero = penisuelaGalleryHeroes.find((hero) => hero.id === activeHeroId);
  const resolvedStat = activeStat && activeCheck?.stats.includes(activeStat) ? activeStat : undefined;
  const relevantLastRoll = state.lastRoll
    && dressingCheckIds.has(state.lastRoll.checkId)
    && (isStageModuleScene
      ? stageModuleCheckIds.has(state.lastRoll.checkId)
      : !stageModuleCheckIds.has(state.lastRoll.checkId))
    ? state.lastRoll
    : null;

  const resetDie = () => {
    resetManualRoll('scene-check');
    setPhysicalRoll('');
    setIsDieRolling(false);
    setDiceError(false);
  };

  const closeCheck = () => {
    setActiveCheckId(null);
    setActiveHeroId(null);
    setActiveStat(null);
    resetDie();
  };

  const beginCheck = (checkId: string) => {
    const check = penisuelaGalleryGameplay.checks.find((item) => item.id === checkId);
    if (!check) return;
    setActiveCheckId(check.id);
    setActiveHeroId(null);
    setActiveStat(check.stats.length === 1 ? check.stats[0] : null);
    resetDie();
  };

  const applyActiveCheck = () => {
    if (!activeCheck || !activeHero || !resolvedStat || !isValidD20(physicalRoll)) return;
    commitManualRoll('scene-check', physicalRoll);
    controller.resolveSceneCheck(
      activeCheck.id,
      activeHero.id,
      resolvedStat,
      [Number(physicalRoll)],
    );
    closeCheck();
  };

  const resetAdventure = () => {
    setSelectedObjectId(null);
    closeCheck();
    controller.resetSession();
  };

  const dressingMasterActions: SceneMasterAction[] = isStageModuleScene
    ? !stageModuleAvailable || stageModuleDisabled
      ? []
      : [
          ...(!state.flags['stage-power-order-complete'] ? [{
            id: 'align-stage-power',
            label: 'Выстроить порядок линий · Интеллект DC 12',
            onSelect: () => beginCheck('align-stage-power'),
          }] : []),
          ...(!state.flags['stage-lever-held'] ? [{
            id: 'hold-stage-lever',
            label: 'Удержать рычаг · Сила DC 12',
            onSelect: () => beginCheck('hold-stage-lever'),
          }] : []),
          ...dressingRoom.stageModule.assistance
            .filter(() => !state.flags['stage-assistance-used'])
            .map((item) => ({
              id: `stage-assistance-${item.id}`,
              label: item.label,
              onSelect: () => controller.assistStageModule(item.id),
            })),
        ]
    : [
        ...(artistClueCount >= 2 && !state.flags['celebrity-kreed-identified'] ? [{
          id: 'identify-secret-artist',
          label: 'Опознать артиста · Интеллект или Харизма DC 12',
          onSelect: () => beginCheck('identify-secret-artist'),
        }] : []),
        ...(routeObjectsReady && !state.flags['dressing-room-route-confirmed'] ? [{
          id: 'read-mask-route',
          label: 'Сопоставить журнал и зеркало · Мудрость DC 12',
          onSelect: () => beginCheck('read-mask-route'),
        }] : []),
        ...(state.flags['dressing-object-satyr-window-inspected']
          && !state.flags['satyr-window-attempted']
          && !state.flags['satyr-freed'] ? [{
            id: 'free-satyr-window',
            label: 'Освободить Satyr через окошко · Ловкость DC 12',
            onSelect: () => beginCheck('free-satyr-window'),
          }] : []),
        ...(!state.flags['dressing-doubles-disabled'] ? [{
          id: 'finish-dressing-rehearsal',
          label: state.flags['satyr-freed']
            ? 'Дать Satyr завершить финальную позу'
            : 'Завершить финальную позу · Харизма DC 12',
          onSelect: state.flags['satyr-freed']
            ? controller.completeDressingRehearsal
            : () => beginCheck('finish-dressing-rehearsal'),
        }] : []),
      ];

  const panelTitle = isStageModuleScene
    ? stageModuleDisabled
      ? 'Второй ключ питания'
      : !stageModuleAvailable
        ? 'Сначала закончите репетицию'
        : relevantLastRoll
          ? penisuelaGalleryGameplay.checks.find((item) => item.id === relevantLastRoll.checkId)?.label ?? scene.title
          : scene.title
    : relevantLastRoll?.checkId === 'identify-secret-artist'
      ? dressingRoom.identity.title
      : relevantLastRoll?.checkId === 'read-mask-route'
        ? dressingRoom.route.title
        : relevantLastRoll?.checkId === 'free-satyr-window'
          ? dressingRoom.satyr.title
          : relevantLastRoll?.checkId === 'finish-dressing-rehearsal'
            ? dressingRoom.rehearsal.title
            : selectedObject?.label ?? scene.title;

  const panelText = isStageModuleScene
    ? stageModuleDisabled
      ? `${dressingRoom.stageModule.success} ${dressingRoom.stageModule.route}`
      : !stageModuleAvailable
        ? 'Техническая ниша остаётся закрыта, пока три дублёра повторяют финальную позу. Вернитесь в гримёрку и завершите репетицию.'
        : relevantLastRoll?.text ?? dressingRoom.stageModule.opening
    : relevantLastRoll?.text
      ?? selectedObject?.description
      ?? dressingRoom.opening;

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      gameMasterConsole={(
        <GameMasterConsole
          campaignScenes={campaignScenes}
          controller={controller}
          definition={penisuelaGalleryGameplay}
          scene={scene}
        />
      )}
      backHref={isStageModuleScene
        ? `/campaign/${campaignId}/play/artists-dressing-room`
        : `/campaign/${campaignId}/play/closed-bar?view=dancers`}
      masterActions={dressingMasterActions}
      scene={scene}
      interactiveContent={(
        <>
          {!isStageModuleScene ? (
            <div className={styles.hotspotField} aria-label="Точки расследования в гримёрке">
              {dressingRoom.objects.map((object) => {
                const inspected = Boolean(state.flags[`dressing-object-${object.id}-inspected`]);
                return (
                  <button
                    aria-label={`${inspected ? 'Повторно осмотреть' : 'Осмотреть'}: ${object.label}`}
                    className={`${styles.hotspot} ${inspected ? styles.inspected : ''}`}
                    key={object.id}
                    style={{left: `${object.hotspotPosition.x}%`, top: `${object.hotspotPosition.y}%`}}
                    type="button"
                    onClick={() => {
                      setSelectedObjectId(object.id);
                      controller.inspectDressingRoomObject(object.id);
                    }}
                  >
                    <span>{object.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <SceneTextPanel
            className={styles.legendPanel}
            resetKey={`${scene.id}:${panelTitle}:${selectedObjectId ?? 'none'}:${state.events.length}`}
          >
            <p className={styles.eyebrow}>
              {isStageModuleScene ? scene.eyebrow : selectedObject ? 'Осмотр сцены' : scene.eyebrow}
            </p>
            <h1>{panelTitle}</h1>
            <p>{panelText}</p>
            {relevantLastRoll ? (
              <p
                className={`${styles.resolution} ${relevantLastRoll.success ? styles.success : styles.failure}`}
                role="status"
              >
                <strong>
                  {relevantLastRoll.automatic
                    ? 'Автоматический успех'
                    : `${relevantLastRoll.rolls.join(' / ')} ${relevantLastRoll.modifier >= 0 ? '+' : '−'} ${Math.abs(relevantLastRoll.modifier)} = ${relevantLastRoll.total}, DC ${relevantLastRoll.dc}`}
                </strong>
              </p>
            ) : null}
            {!isStageModuleScene && state.flags['dressing-doubles-disabled'] ? (
              <p className={styles.routeNotice} role="status">
                Дублёры отключены. Техническая ниша за зеркалом открыта.
              </p>
            ) : null}
            {isStageModuleScene && stageModuleAvailable && !stageModuleDisabled ? (
              <div className={styles.moduleProgress} aria-label="Состояние линий питания">
                <span data-complete={Boolean(state.flags['stage-power-order-complete'])}>Порядок линий</span>
                <span data-complete={Boolean(state.flags['stage-lever-held'])}>Механический рычаг</span>
              </div>
            ) : null}
            <div className={styles.actions}>
              {isStageModuleScene ? (
                <Link to={`/campaign/${campaignId}/play/artists-dressing-room`}>Вернуться в гримёрку</Link>
              ) : (
                <Link to={`/campaign/${campaignId}/play/closed-bar-dancers`}>Вернуться к танцорам</Link>
              )}
              {!isStageModuleScene && state.flags['dressing-doubles-disabled'] ? (
                <Link to={`/campaign/${campaignId}/play/stage-module-shutdown`}>Открыть питание сцены</Link>
              ) : null}
              {!isStageModuleScene && !state.flags['dressing-doubles-disabled'] ? (
                <Link to={`/campaign/${campaignId}/play/dressing-room-double-fight`}>
                  Сорвать маски силой
                </Link>
              ) : null}
              {isStageModuleScene && stageModuleDisabled ? (
                <Link to={`/campaign/${campaignId}/play/guest-bungalows`}>Идти к гостевым бунгало</Link>
              ) : null}
              {isStageModuleScene
                && stageModuleAvailable
                && !stageModuleDisabled
                && state.flags['dressing-room-route-confirmed'] ? (
                  <Link to={`/campaign/${campaignId}/play/guest-bungalows`}>
                    Оставить модуль включённым и спешить к бунгало
                  </Link>
                ) : null}
              {!isStageModuleScene
                && state.flags['dressing-doubles-disabled']
                && state.flags['dressing-room-route-confirmed'] ? (
                  <Link to={`/campaign/${campaignId}/play/guest-bungalows`}>Спешить к гостевым бунгало</Link>
                ) : null}
            </div>
          </SceneTextPanel>

          {activeCheck ? (
            <div className={styles.checkBackdrop} role="presentation" onMouseDown={closeCheck}>
              <section
                aria-label={activeCheck.label}
                aria-modal="true"
                className={styles.checkModal}
                role="dialog"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header className={styles.checkHeading}>
                  <div>
                    <span>Проверка · DC {activeCheck.dc}</span>
                    <h2>{activeCheck.label}</h2>
                  </div>
                  <button aria-label="Закрыть проверку" type="button" onClick={closeCheck}>×</button>
                </header>
                <div className={styles.heroChoices} aria-label="Выбор героя">
                  {penisuelaGalleryHeroes.map((hero) => (
                    <button
                      aria-pressed={activeHeroId === hero.id}
                      className={activeHeroId === hero.id ? styles.selected : ''}
                      key={hero.id}
                      type="button"
                      onClick={() => setActiveHeroId(hero.id)}
                    >
                      {hero.name}
                    </button>
                  ))}
                </div>
                <div className={styles.statChoices} aria-label="Выбор характеристики">
                  {activeCheck.stats.map((stat) => (
                    <button
                      aria-pressed={activeStat === stat}
                      className={activeStat === stat ? styles.selected : ''}
                      key={stat}
                      type="button"
                      onClick={() => setActiveStat(stat)}
                    >
                      {statLabels[stat]}
                      {activeHero ? ` ${(activeHero.stats[stat] ?? 0) >= 0 ? '+' : ''}${activeHero.stats[stat] ?? 0}` : ''}
                    </button>
                  ))}
                </div>
                <div className={styles.rollControls}>
                  <button
                    disabled={isDieRolling || !isDiceReady || !activeHero || !resolvedStat}
                    type="button"
                    onClick={() => {
                      setPhysicalRoll('');
                      setDiceError(false);
                      setIsDieRolling(true);
                      setDieRollRequestId((value) => value + 1);
                    }}
                  >
                    {isDieRolling ? 'Кубик в полёте…' : isDiceReady ? 'Бросить кубик' : 'Кубик готовится…'}
                  </button>
                  <label>
                    <span>Результат физического d20</span>
                    <input
                      disabled={isDieRolling}
                      max="20"
                      min="1"
                      type="number"
                      value={physicalRoll}
                      onChange={(event) => {
                        markManualRoll('scene-check');
                        setPhysicalRoll(event.target.value);
                        setDiceError(false);
                      }}
                    />
                  </label>
                  <button
                    disabled={!activeHero || !resolvedStat || isDieRolling || !isValidD20(physicalRoll)}
                    type="button"
                    onClick={applyActiveCheck}
                  >
                    Узнать исход
                  </button>
                </div>
                <p className={styles.rollStatus} aria-live="polite">
                  {diceError
                    ? '3D-кубик не загрузился. Введите результат физического d20 вручную.'
                    : isDieRolling
                      ? 'D20 катится по столу.'
                      : isValidD20(physicalRoll)
                        ? `Принят результат ${physicalRoll}. Исход ещё не применён.`
                        : ''}
                </p>
              </section>
            </div>
          ) : null}

          <D20Roller
            diceExpression="1d20"
            requestId={dieRollRequestId}
            rollLabel={activeCheck?.label ?? 'Проверка гримёрки'}
            rolling={isDieRolling}
            onError={() => {
              setIsDieRolling(false);
              setDiceError(true);
            }}
            onReadyChange={setIsDiceReady}
            onResult={(result) => {
              setPhysicalRoll(String(result));
              setIsDieRolling(false);
            }}
          />
        </>
      )}
    />
  );
}
