import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
  penisuelaSessionPreview,
} from '../../../../entities/campaign-session/model/playableData';
import type {GalleryCheckDefinition, GalleryDoorDefinition, GalleryView, HeroStat} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {
  CampaignSceneInspectable,
  CampaignSessionScene,
} from '../../../../entities/campaign-session/model/types';
import {InspectableArtifact} from '../../../../entities/campaign-session/ui/InspectableArtifact/InspectableArtifact';
import {InspectableArtifactDialog} from '../../../../entities/campaign-session/ui/InspectableArtifactDialog/InspectableArtifactDialog';
import type {CombatPortraitPresentation} from '../../../../entities/combat/model/view';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {getCombatActionResourceKey} from '../../../../features/run-combat/model/combatCommands';
import {SceneDecisionModal} from '../../../../features/navigate-campaign-scene/ui/SceneDecisionModal/SceneDecisionModal';
import type {SceneMasterAction} from '../../../../features/navigate-campaign-scene/ui/SceneMasterControl/SceneMasterControl';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {DiceSelectionMode} from '../../../../shared/lib/dice/diceSelection';
import {useManualCriticalRollEffect} from '../../../../shared/lib/dice/useManualCriticalRollEffect';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {CombatEncounterHud} from '../CombatEncounterHud/CombatEncounterHud';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import styles from './GalleryAdventure.module.css';

const pussyRewardInspectableIds = [
  'pussy-sultan-bar-passes',
  'pussy-sultan-womanizer',
];
const alexisDressingRoomKeyId = 'alexis-dressing-room-key';

const statLabels: Record<HeroStat, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  wisdom: 'Мудрость',
  intelligence: 'Интеллект',
  charisma: 'Харизма',
};

const heroAvatarPaths: Record<string, string> = {
  bubsilda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/bubsilda.png',
  linda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/linda.png',
  lambert: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/lambert.png',
  'golovach-lena': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/golovach-lena.png',
  'thorin-pukoshchit': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/thorin-pukoshchit.png',
};

const heroPortraits: Record<string, CombatPortraitPresentation> = {
  bubsilda: {scale: 1.1731, shiftYPercent: 7.3},
  linda: {scale: 1.0347, shiftYPercent: 1.2},
  lambert: {scale: 1.0838, shiftYPercent: 3.8},
  'golovach-lena': {scale: 1.0187, shiftYPercent: 0.3},
  'thorin-pukoshchit': {scale: 1.1698, shiftYPercent: 7.9},
};

function isDoorAvailable(door: GalleryDoorDefinition, flags: Record<string, boolean>) {
  const allReady = door.requiresAllFlags?.every((flag) => flags[flag]) ?? true;
  const anyReady = door.requiresAnyFlag?.some((flag) => flags[flag]) ?? true;
  return door.status === 'open' || (allReady && anyReady);
}

function isValidD20(value: string) {
  const roll = Number(value);
  return Number.isInteger(roll) && roll >= 1 && roll <= 20;
}

function sceneForView(view: GalleryView, flags: Record<string, boolean>, encounterId?: string) {
  const sceneId = view === 'gallery'
    ? flags['rail-kraken-defeated-in-combat'] ? 'hotel-gallery-kraken-defeated'
      : flags['rail-kraken-disabled'] ? 'hotel-gallery-kraken-linda-disabled'
        : 'hotel-gallery'
    : view === 'pussy'
      ? flags['pussy-guards-defeated'] ? 'hotel-vip-guards-defeated'
        : flags['scepter-returned'] ? 'hotel-gallery-pussy-return' : 'hotel-gallery-pussy'
    : view === 'prop-room'
      ? 'pussy-prop-room'
        : view === 'archive' ? 'hotel-archive-alexis'
          : view === 'combat' && encounterId === 'hotel-vip-guards'
            ? 'hotel-vip-guards'
            : view === 'combat' && encounterId === 'prop-room-winding-carriers'
              ? 'pussy-prop-room'
            : view === 'guards'
              ? flags['pussy-guards-defeated'] ? 'hotel-vip-guards-defeated' : 'hotel-vip-guards'
            : view === 'kraken' || view === 'combat' ? 'hotel-gallery-kraken'
            : 'closed-bar';
  const scene = penisuelaSessionPreview.scenes.find((item) => item.id === sceneId)
    ?? penisuelaSessionPreview.scenes.find((item) => item.id === 'hotel-gallery')!;
  if ((view === 'pussy' || encounterId === 'hotel-vip-guards') && flags['pussy-lore-revealed'] && scene.id === 'hotel-gallery-pussy') {
    return {...scene, alt: 'Pussy Sultan в роскошном наряде встречает героев в разгромленной VIP-зоне отеля.'};
  }
  if (scene.id !== 'pussy-prop-room') return scene;
  const viewId = flags['prop-room-carriers-defeated']
    ? 'carriers-defeated'
    : flags['prop-room-carriers-awakened'] || encounterId === 'prop-room-winding-carriers'
      ? 'carriers-awakened'
      : flags['prop-room-force-only']
        ? 'force-only'
        : null;
  const interactionView = viewId
    ? scene.interactionViews?.find((candidate) => candidate.id === viewId)
    : undefined;
  return interactionView
    ? {...scene, background: interactionView.background, alt: interactionView.alt}
    : scene;
}

interface GalleryAdventureProps {
  entryView?: GalleryView;
}

export function GalleryAdventure({entryView}: GalleryAdventureProps) {
  const legacySceneIds = useMemo(() => penisuelaSessionPreview.scenes.map((scene) => scene.id), []);
  const controller = useGallerySession(
    penisuelaGalleryGameplay,
    penisuelaGalleryHeroes,
    legacySceneIds,
  );
  const {state} = controller;
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
  const [selectedHeroId, setSelectedHeroId] = useState(penisuelaGalleryHeroes[0]?.id ?? '');
  const [selectedStat, setSelectedStat] = useState<HeroStat>('strength');
  const [physicalRoll, setPhysicalRoll] = useState('');
  const [selectedDoorId, setSelectedDoorId] = useState<GalleryDoorDefinition['id'] | null>(null);
  const [pussyLoreOpen, setPussyLoreOpen] = useState(false);
  const [pussyGmPanelOpen, setPussyGmPanelOpen] = useState(false);
  const [pussyFallbacksOpen, setPussyFallbacksOpen] = useState(false);
  const [pussyQuestOfferOpen, setPussyQuestOfferOpen] = useState(false);
  const [propRoomDecisionOpen, setPropRoomDecisionOpen] = useState(false);
  const [krakenDecisionOpen, setKrakenDecisionOpen] = useState(false);
  const [alexisDecisionOpen, setAlexisDecisionOpen] = useState(false);
  const [scepterModalOpen, setScepterModalOpen] = useState(false);
  const [alexisRewardModalOpen, setAlexisRewardModalOpen] = useState(false);
  const [pussyRewardPreviewIndex, setPussyRewardPreviewIndex] = useState<number | null>(null);
  const syncedEntryViewRef = useRef<GalleryView | undefined>(undefined);

  useEffect(() => {
    if (!entryView || syncedEntryViewRef.current === entryView) return;
    syncedEntryViewRef.current = entryView;
    if (state.activeView !== entryView) controller.changeView(entryView);
  }, [controller, entryView, state.activeView]);
  const [isDieRolling, setIsDieRolling] = useState(false);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const [dieRollRequestId, setDieRollRequestId] = useState(0);
  const [diceError, setDiceError] = useState(false);
  const [activeDiceExpression, setActiveDiceExpression] = useState('1d20');
  const [activeDiceLabel, setActiveDiceLabel] = useState('Бросок d20');
  const [activeDiceSelection, setActiveDiceSelection] = useState<DiceSelectionMode>('sum');
  const {commitManualRoll, markManualRoll, resetManualRoll} = useManualCriticalRollEffect();
  const activeScene = useMemo(
    () => sceneForView(state.activeView, state.flags, state.combat?.encounterId),
    [state.activeView, state.combat?.encounterId, state.flags],
  );
  const acquiredInspectableIds = useMemo(
    () => state.inventory.filter((id) =>
      penisuelaSessionPreview.scenes.some((scene) => scene.inspectables.some((item) => item.id === id)),
    ),
    [state.inventory],
  );
  const scepterArtifact = useMemo(
    () => penisuelaSessionPreview.scenes
      .flatMap((scene) => scene.inspectables)
      .find((artifact) => artifact.id === 'pussy-sultan-golden-scepter-microphone'),
    [],
  );
  const pussyRewardArtifacts = useMemo(
    () => pussyRewardInspectableIds
      .map((id) => penisuelaSessionPreview.scenes
        .flatMap((scene) => scene.inspectables)
        .find((artifact) => artifact.id === id))
      .filter((artifact): artifact is CampaignSceneInspectable => Boolean(artifact)),
    [],
  );
  const activePussyRewardArtifact = pussyRewardPreviewIndex === null
    ? undefined
    : pussyRewardArtifacts[pussyRewardPreviewIndex];
  const alexisDressingRoomKeyArtifact = useMemo(
    () => penisuelaSessionPreview.scenes
      .flatMap((scene) => scene.inspectables)
      .find((artifact) => artifact.id === alexisDressingRoomKeyId),
    [],
  );
  const activeCombatantId = state.combat?.initiativeOrder[state.combat.turnIndex];

  useEffect(() => {
    if (state.activeView === 'pussy') return;
    setPussyLoreOpen(false);
    setPussyGmPanelOpen(false);
    setPussyFallbacksOpen(false);
    setPussyQuestOfferOpen(false);
    setPropRoomDecisionOpen(false);
    setPussyRewardPreviewIndex(null);
  }, [state.activeView]);

  useEffect(() => {
    if (state.activeView !== 'kraken') setKrakenDecisionOpen(false);
  }, [state.activeView]);

  useEffect(() => {
    if (state.activeView !== 'archive') {
      setAlexisDecisionOpen(false);
      setAlexisRewardModalOpen(false);
    }
  }, [state.activeView]);

  useEffect(() => {
    if (state.flags['pussy-trust-refused'] && !state.flags['pussy-path-resolved']) return;
    setPussyFallbacksOpen(false);
  }, [state.flags]);

  useEffect(() => {
    if (state.flags['pussy-trust-max'] && !state.flags['pussy-quest-accepted']) return;
    setPussyQuestOfferOpen(false);
  }, [state.flags]);

  useEffect(() => {
    setPhysicalRoll('');
    setIsDieRolling(false);
  }, [activeCombatantId]);

  const resetDie = () => {
    resetManualRoll('scene-check');
    setIsDieRolling(false);
    setPhysicalRoll('');
    setDiceError(false);
    setActiveDiceSelection('sum');
  };

  const startDiceRoll = (
    diceExpression = '1d20',
    diceLabel = 'Бросок d20',
    selectionMode: DiceSelectionMode = 'sum',
  ) => {
    if (isDieRolling || !isDiceReady) return;
    resetManualRoll('scene-check');
    setPhysicalRoll('');
    setActiveDiceExpression(diceExpression);
    setActiveDiceLabel(diceLabel);
    setActiveDiceSelection(selectionMode);
    setDiceError(false);
    setIsDieRolling(true);
    setDieRollRequestId((value) => value + 1);
  };

  const finishDiceRoll = (result: number) => {
    setPhysicalRoll(String(result));
    setIsDieRolling(false);
  };

  const failDiceRoll = () => {
    setIsDieRolling(false);
    setDiceError(true);
  };

  const updateRollInput = (value: string) => {
    setPhysicalRoll(value);
    setDiceError(false);
  };

  const beginCheck = (check: GalleryCheckDefinition, preferredHeroId?: string, preferredStat?: HeroStat) => {
    const defaultHeroId = check.eligibleHeroIds?.[0] ?? penisuelaGalleryHeroes[0]?.id ?? '';
    setActiveCheckId(check.id);
    setSelectedHeroId(preferredHeroId ?? defaultHeroId);
    setSelectedStat(preferredStat ?? check.stats[0]);
    resetDie();
  };

  const applyCheck = (abilityId?: string) => {
    if (!activeCheckId) return;
    const resolvedCheckId = activeCheckId;
    const numericRoll = Number(physicalRoll);
    const rolls = abilityId === 'hypnotic-smile'
      ? undefined
      : isValidD20(physicalRoll) ? [numericRoll] : undefined;
    if (!abilityId && !rolls) return;
    if (!abilityId) commitManualRoll('scene-check', numericRoll);
    const result = controller.resolveSceneCheck(resolvedCheckId, selectedHeroId, selectedStat, rolls, abilityId);
    if (resolvedCheckId === 'earn-pussy-acquaintance' && result?.success) {
      setPussyLoreOpen(true);
    }
    if (resolvedCheckId === 'earn-pussy-trust') setPussyQuestOfferOpen(false);
    if (['earn-pussy-acquaintance', 'earn-pussy-trust', 'intimidate-pussy', 'steal-pussy-key'].includes(resolvedCheckId)) {
      setPussyGmPanelOpen(false);
    }
    if (
      (
        resolvedCheckId === 'recover-pussy-scepter'
        || resolvedCheckId === 'recover-pussy-scepter-with-engineering'
        || resolvedCheckId === 'recover-pussy-scepter-with-tiny-linda'
      )
      && result?.success
    ) {
      setScepterModalOpen(true);
    }
    setActiveCheckId(null);
    resetDie();
  };

  const renderLastRoll = () => state.lastRoll ? (
    <p className={`${styles.resolution} ${state.lastRoll.success ? styles.success : styles.failure}`} role="status">
      <span className={styles.resolutionLabel}>Результат проверки</span>
      <strong>{state.lastRoll.automatic ? 'Автоматический успех' : `${state.lastRoll.rolls.join(' / ')} ${state.lastRoll.modifier >= 0 ? '+' : '−'} ${Math.abs(state.lastRoll.modifier)} = ${state.lastRoll.total}, DC ${state.lastRoll.dc}`}</strong>
      <span>{state.lastRoll.text}</span>
    </p>
  ) : null;

  const renderCheckPanel = () => {
    const check = penisuelaGalleryGameplay.checks.find((item) => item.id === activeCheckId);
    if (!check) return null;
    const selectedHero = penisuelaGalleryHeroes.find((hero) => hero.id === selectedHeroId);
    const eligibleHeroes = check.eligibleHeroIds
      ? penisuelaGalleryHeroes.filter((hero) => check.eligibleHeroIds?.includes(hero.id))
      : penisuelaGalleryHeroes;
    const effectiveDc = check.dc + (check.dcModifiers ?? [])
      .filter((modifier) => state.flags[modifier.flag])
      .reduce((sum, modifier) => sum + modifier.delta, 0);

    return (
      <div className={styles.checkPanel} role="group" aria-label={check.label}>
        <div className={styles.checkHeading}>
          <div>
            <span>Проверка · DC {effectiveDc}</span>
            <strong>{check.label}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveCheckId(null);
              resetDie();
            }}
            aria-label="Закрыть проверку"
          >×</button>
        </div>
        <div className={styles.heroChoices}>
          {eligibleHeroes.map((hero) => (
            <button
              className={hero.id === selectedHeroId ? styles.selected : ''}
              key={hero.id}
              type="button"
              onClick={() => setSelectedHeroId(hero.id)}
            >
              <span className={styles.heroAvatarFrame}>
                <img data-hero-id={hero.id} src={resolveAsset(heroAvatarPaths[hero.id])} alt="" />
              </span>
              <span className={styles.heroChoiceName}>{hero.name}</span>
            </button>
          ))}
        </div>
        <div className={styles.statChoices}>
          {check.stats.map((stat) => (
            <button
              className={stat === selectedStat ? styles.selected : ''}
              key={stat}
              type="button"
              onClick={() => setSelectedStat(stat)}
            >
              {statLabels[stat]} {selectedHero ? `${(selectedHero.stats[stat] ?? 0) >= 0 ? '+' : ''}${selectedHero.stats[stat] ?? 0}` : ''}
            </button>
          ))}
        </div>
        <div className={styles.rollControls}>
          <button
            className={styles.dieRollButton}
            type="button"
            disabled={isDieRolling || !isDiceReady}
            onClick={() => startDiceRoll()}
          >
            {isDieRolling ? 'Кубик в полёте…' : isDiceReady ? 'Бросить кубик' : 'Кубик готовится…'}
          </button>
          <label>
            <span>Результат d20</span>
            <input
              type="number"
              min="1"
              max="20"
              value={physicalRoll}
              disabled={isDieRolling}
              onChange={(event) => {
                markManualRoll('scene-check');
                updateRollInput(event.target.value);
              }}
            />
          </label>
          {isValidD20(physicalRoll) ? (
            <button type="button" disabled={isDieRolling} onClick={() => applyCheck()}>Узнать исход</button>
          ) : null}
          <span className={styles.rollStatus} aria-live="polite">
            {diceError ? '3D-кубик не загрузился. Введите результат физического d20 вручную.' : isDieRolling ? 'D20 катится по столу.' : isValidD20(physicalRoll) ? `Принят результат ${physicalRoll}. Исход проверки ещё скрыт.` : ''}
          </span>
        </div>
      </div>
    );
  };

  const enterDoor = (door: GalleryDoorDefinition) => {
    if (!isDoorAvailable(door, state.flags)) return;
    setSelectedDoorId(null);
    controller.changeView(door.view);
  };

  const resetAdventure = () => {
    setActiveCheckId(null);
    setSelectedDoorId(null);
    setPhysicalRoll('');
    setPussyLoreOpen(false);
    setPussyGmPanelOpen(false);
    setPussyFallbacksOpen(false);
    setPussyQuestOfferOpen(false);
    setPropRoomDecisionOpen(false);
    setKrakenDecisionOpen(false);
    setAlexisDecisionOpen(false);
    setScepterModalOpen(false);
    setAlexisRewardModalOpen(false);
    setPussyRewardPreviewIndex(null);
    resetDie();
    controller.resetSession();
  };

  const beginPussyRewardPresentation = () => {
    if (pussyRewardArtifacts.length !== pussyRewardInspectableIds.length) return;
    setPussyRewardPreviewIndex(0);
  };

  const closePussyRewardPresentation = () => {
    if (pussyRewardPreviewIndex === null) return;
    if (pussyRewardPreviewIndex < pussyRewardArtifacts.length - 1) {
      setPussyRewardPreviewIndex((current) => current === null ? null : current + 1);
      return;
    }

    setPussyRewardPreviewIndex(null);
    controller.grantPussyReward();
  };

  const beginAlexisRewardPresentation = () => {
    if (!alexisDressingRoomKeyArtifact) return;
    setAlexisRewardModalOpen(true);
  };

  const closeAlexisRewardPresentation = () => {
    setAlexisRewardModalOpen(false);
    controller.completeAlexisProkhorTask();
  };

  const renderGallery = () => {
    const selectedDoor = penisuelaGalleryGameplay.doors.find((door) => door.id === selectedDoorId);
    const selectedDoorAvailable = selectedDoor ? isDoorAvailable(selectedDoor, state.flags) : false;
    const defaultNarration = state.flags['archive-resolved']
      ? penisuelaGalleryGameplay.narration.passageOpen
      : state.flags['archive-key-recovered']
        ? penisuelaGalleryGameplay.narration.archiveWithKey
        : state.flags['rail-kraken-resolved']
          ? penisuelaGalleryGameplay.narration.afterKraken
          : penisuelaGalleryGameplay.narration.initial;
    const pussyQuestAccepted = Boolean(state.flags['pussy-quest-accepted'] || state.flags['vip-prop-room-open']);
    const narration = selectedDoor
      ? selectedDoorAvailable && selectedDoor.availableDescription
        && (selectedDoor.id !== 'prop-room-stairs' || pussyQuestAccepted)
        ? selectedDoor.availableDescription
        : selectedDoor.description
      : defaultNarration;

    return (
      <>
        <div className={styles.doorField} aria-label="Двери гостиничной галереи">
          {penisuelaGalleryGameplay.doors.map((door) => (
            <button
              aria-label={door.label}
              className={styles.door}
              data-door={door.id}
              key={door.id}
              type="button"
              aria-pressed={door.id === selectedDoorId}
              onClick={() => setSelectedDoorId(door.id)}
            />
          ))}
        </div>
        <SceneTextPanel
          className={styles.legendPanel}
          resetKey={`${activeScene.id}:${selectedDoorId ?? 'default'}`}
        >
          <p className={styles.eyebrow}>Рассказчик</p>
          <h1>Гостиничная галерея</h1>
          <p>{narration}</p>
          {selectedDoor && !selectedDoorAvailable ? (
            <p className={styles.notice} role="status">
              {selectedDoor.lockedDescription ?? 'Дверь пока не открывается.'}
            </p>
          ) : null}
          {selectedDoor && selectedDoorAvailable ? (
            <div className={styles.actions}>
              <button type="button" onClick={() => enterDoor(selectedDoor)}>{selectedDoor.actionLabel}</button>
            </div>
          ) : null}
          {!selectedDoor && state.flags['archive-resolved'] ? (
            <div className={styles.actions}>
              <Link to="/campaign/penisuela/play/closed-bar">Продолжить по следу</Link>
            </div>
          ) : null}
        </SceneTextPanel>
      </>
    );
  };

  const renderPussy = () => {
    const dialogue = penisuelaGalleryGameplay.dialogues.pussy;
    const pussyQuestAccepted = Boolean(state.flags['pussy-quest-accepted'] || state.flags['vip-prop-room-open']);
    const pussyAcquainted = Boolean(state.flags['pussy-acquainted']);
    const pussyAcquaintanceFailed = Boolean(state.flags['pussy-acquaintance-failed']);
    const pussyLoreRevealed = Boolean(state.flags['pussy-lore-revealed']);
    const pussyTrustMax = Boolean(state.flags['pussy-trust-max']);
    const pussyTrustRefused = Boolean(state.flags['pussy-trust-refused']);
    const pussyPathResolved = Boolean(state.flags['pussy-path-resolved']);
    const scepterRewardDialogue = Boolean(
      state.flags['pussy-quest-accepted']
      && state.flags['rail-kraken-resolved']
      && state.flags['scepter-recovered'],
    );
    const acquaintanceCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'earn-pussy-acquaintance')!;
    const trustCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'earn-pussy-trust')!;
    const threatCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'intimidate-pussy')!;
    const theftCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'steal-pussy-key')!;
    const revealPussyToPlayers = () => {
      controller.revealPussyLore();
      setPussyGmPanelOpen(false);
      setPussyLoreOpen(true);
    };
    const publicStatus = state.flags['pussy-reward-received']
      ? 'Скипетр снова в руке хозяина, а два королевских подарка переходят к героям. Pussy Sultan устраивается среди подушек с видом человека, который только что лично восстановил мировой порядок.'
      : state.flags['scepter-returned']
        ? activeScene.readAloud
      : state.flags['pussy-guards-defeated']
        ? pussyLoreRevealed ? dialogue.guardsDefeated : dialogue.acquaintance
        : state.flags['pussy-intimidated']
          ? pussyLoreRevealed ? dialogue.threatSuccess : dialogue.threatSuccessAnonymous
          : state.flags['pussy-key-stolen']
            ? dialogue.theftSuccess
      : state.flags['scepter-recovered']
        ? 'Золотой скипетр вернулся из-под паланкина. Pussy Sultan протягивает раскрытую ладонь и терпеливо ждёт завершения церемонии.'
        : pussyQuestAccepted
          ? 'Pussy Sultan остаётся у пустого крепления и ждёт возвращения своей золотой регалии.'
          : pussyTrustMax
            ? pussyLoreRevealed ? dialogue.yesterdayReveal : dialogue.charmSuccess
            : pussyTrustRefused
              ? pussyLoreRevealed ? dialogue.trustRefusal : dialogue.charmFailure
            : pussyLoreRevealed
              ? dialogue.yesterdayRefusal
              : pussyAcquainted
                ? dialogue.acquaintance
                : null;

    return (
      <>
        <SceneTextPanel className={styles.dialoguePanel} resetKey={activeScene.id}>
        <p className={styles.eyebrow}>Разговор · {pussyLoreRevealed ? dialogue.speaker : 'незнакомец'}</p>
        <h1>{pussyLoreRevealed ? dialogue.speaker : 'Незнакомец у трона'}</h1>
        {!pussyAcquainted && !pussyQuestAccepted && !state.flags['scepter-recovered'] ? (
          <blockquote>{pussyAcquaintanceFailed ? dialogue.acquaintanceFailure : dialogue.opening}</blockquote>
        ) : (
          <p className={styles.characterStatus}>{publicStatus}</p>
        )}
        <div className={styles.actions}>
          {!scepterRewardDialogue && pussyLoreRevealed ? (
            <button type="button" onClick={() => setPussyLoreOpen(true)}>Открыть лор Pussy Sultan</button>
          ) : null}
          <button className={styles.secondaryAction} type="button" onClick={() => controller.changeView('gallery')}>Вернуться в галерею</button>
        </div>
        {pussyLoreOpen && pussyLoreRevealed && dialogue.lore ? createPortal((
          <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setPussyLoreOpen(false)}>
            <section className={`${styles.characterModal} ${styles.loreModal}`} role="dialog" aria-modal="true" aria-labelledby="pussy-lore-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className={styles.loreArtwork}>
                <img src={resolveAsset(dialogue.lore.art)} alt={dialogue.lore.alt} />
              </div>
              <div className={styles.loreContent}>
                <div className={styles.modalHeader}>
                  <div>
                    <p className={styles.eyebrow}>Лор персонажа</p>
                    <h2 id="pussy-lore-title">{dialogue.lore.title}</h2>
                  </div>
                  <button type="button" onClick={() => setPussyLoreOpen(false)} aria-label="Закрыть лор персонажа">×</button>
                </div>
                <div className={styles.loreText}>
                  {dialogue.lore.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </div>
            </section>
          </div>
        ), document.body) : null}
        {pussyGmPanelOpen ? createPortal((
          <div className={`${styles.modalBackdrop} ${styles.gmBackdrop}`} role="presentation" onMouseDown={() => setPussyGmPanelOpen(false)}>
            <section className={`${styles.characterModal} ${styles.gmModal}`} role="dialog" aria-modal="true" aria-labelledby="pussy-gm-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 id="pussy-gm-title">Панель мастера</h2>
                </div>
                <button type="button" onClick={() => setPussyGmPanelOpen(false)} aria-label="Закрыть панель мастера">×</button>
              </div>
              {activeCheckId ? renderCheckPanel() : (
                <>
                  {!pussyAcquainted && !pussyAcquaintanceFailed ? (
                    <div className={styles.gmChoices}>
                      <p>Незнакомец отказывается представляться: сначала пятёрке нужно доказать, что она достойна знакомства.</p>
                      <button type="button" onClick={() => beginCheck(acquaintanceCheck, undefined, 'charisma')}>Заслужить знакомство · DC 12</button>
                    </div>
                  ) : null}
                  {pussyAcquaintanceFailed && !pussyAcquainted && !pussyTrustMax && !pussyPathResolved && !state.flags['pussy-guards-summoned'] ? (
                    <div className={styles.gmChoices}>
                      <p>{dialogue.acquaintanceFailure}</p>
                      {!pussyTrustRefused ? (
                        <button type="button" onClick={() => beginCheck(trustCheck, 'bubsilda', 'charisma')}>Девушки: очаровать · Харизма</button>
                      ) : null}
                      <button type="button" onClick={() => beginCheck(threatCheck, 'golovach-lena', 'strength')}>Надавить силой · Сила</button>
                    </div>
                  ) : null}
                  {pussyAcquainted && !pussyLoreRevealed ? (
                    <div className={styles.gmRevealControl}>
                      <p>Знакомство состоялось. Опубликуй имя и лор: мастерская панель закроется, а карточка Pussy Sultan сразу откроется игрокам.</p>
                      <button type="button" onClick={revealPussyToPlayers}>Открыть имя и лор</button>
                    </div>
                  ) : null}
                  {pussyLoreRevealed && !pussyTrustMax && !pussyTrustRefused && !pussyPathResolved ? (
                    <div className={styles.gmChoices}>
                      <p>{dialogue.yesterdayRefusal}</p>
                      <button type="button" onClick={() => beginCheck(trustCheck, 'bubsilda', 'charisma')}>Девушки: заслужить доверие · Харизма</button>
                    </div>
                  ) : null}
                  {pussyAcquainted && pussyTrustRefused && !pussyPathResolved && !state.flags['pussy-guards-summoned'] ? (
                    <div className={styles.gmChoices}>
                      <p>{dialogue.trustRefusal}</p>
                      {!pussyFallbacksOpen ? (
                        <button className={styles.hiddenAction} type="button" onClick={() => setPussyFallbacksOpen(true)}>Открыть скрытые подходы</button>
                      ) : (
                        <div className={styles.fallbackChoices}>
                          <p>Разговор закрыт, но мастер может предложить партии рискованный обходной путь.</p>
                          <button type="button" onClick={() => beginCheck(threatCheck, 'golovach-lena', 'strength')}>Надавить силой · Сила</button>
                          <button type="button" onClick={() => beginCheck(theftCheck, 'linda', 'dexterity')}>Линда: уменьшиться и украсть ключ</button>
                          <p className={styles.gmAside}>{dialogue.theftPrompt}</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {state.flags['pussy-key-stolen'] ? (
                    <div className={styles.gmChoices}>
                      <p>Ключ у героев. Pussy Sultan не поделился воспоминаниями и не предложил поручение.</p>
                    </div>
                  ) : null}
                  {(state.flags['pussy-intimidated'] || state.flags['pussy-guards-defeated']) ? (
                    <div className={styles.gmChoices}>
                      <p>Pussy Sultan рассказал всё, что помнит, и отдал ключ. Ветка доверия, поручение и Вуманайзер закрыты.</p>
                    </div>
                  ) : null}
                  {pussyLoreRevealed && pussyTrustMax && !pussyQuestAccepted ? (
                    pussyQuestOfferOpen ? (
                      <div className={styles.questOffer}>
                        <div>
                          <span>Новое поручение</span>
                          <h3>Вернуть золотой скипетр</h3>
                        </div>
                        <p>{dialogue.quest}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setPussyQuestOfferOpen(false);
                            controller.acceptPussyTask();
                          }}
                        >Принять поручение</button>
                      </div>
                    ) : (
                      <div className={styles.resultContinuation}>
                        <button type="button" onClick={() => setPussyQuestOfferOpen(true)}>Продолжить разговор</button>
                      </div>
                    )
                  ) : null}
                  {pussyQuestAccepted && !state.flags['scepter-recovered'] ? (
                    <div className={styles.gmChoices}>
                      <p>{dialogue.quest}</p>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        ), document.body) : null}
        </SceneTextPanel>
      </>
    );
  };

  const renderPropRoom = () => {
    const pussyQuestAccepted = Boolean(state.flags['pussy-quest-accepted'] || state.flags['vip-prop-room-open']);
    const carriersAwakened = Boolean(state.flags['prop-room-carriers-awakened']);
    const carriersDefeated = Boolean(state.flags['prop-room-carriers-defeated']);
    const sceneText = carriersDefeated
      ? state.flags['scepter-recovered']
        ? penisuelaGalleryGameplay.narration.propRoomRecoveredAfterCarriers
        : activeScene.readAloud
      : state.flags['scepter-recovered']
        ? penisuelaGalleryGameplay.narration.propRoomRecovered
        : activeScene.readAloud;
    return (
      <>
        <SceneTextPanel className={styles.dialoguePanel} resetKey={activeScene.id}>
          <p className={styles.eyebrow}>{activeScene.eyebrow}</p>
          <h1>{activeScene.title}</h1>
          <p>{sceneText}</p>
          {renderLastRoll()}
          {pussyQuestAccepted && !state.flags['scepter-recovered'] && !carriersAwakened ? (
            <p className={styles.sceneContinuation}>{penisuelaGalleryGameplay.narration.propRoomQuest}</p>
          ) : null}
          {!carriersDefeated || state.flags['scepter-recovered'] ? (
            <div className={styles.actions}>
              <button
                className={styles.secondaryAction}
                type="button"
                onClick={() => controller.changeView('gallery')}
              >
                {state.flags['scepter-recovered'] ? 'Спуститься в галерею' : 'Вернуться в галерею'}
              </button>
            </div>
          ) : null}
        </SceneTextPanel>

        {carriersDefeated && !state.flags['scepter-recovered'] && scepterArtifact ? (
          <div className={styles.propRoomScepterField} aria-label="Осмотр разбитого паланкина">
            <InspectableArtifact
              artifact={scepterArtifact}
              presentation="search"
              onFind={() => {
                controller.collectScepter();
                setScepterModalOpen(true);
              }}
              onOpen={() => undefined}
            />
          </div>
        ) : null}

        {pussyQuestAccepted && activeCheckId ? createPortal((
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onMouseDown={() => {
              setActiveCheckId(null);
              resetDie();
            }}
          >
            <section
              className={`${styles.characterModal} ${styles.gmModal}`}
              role="dialog"
              aria-modal="true"
              aria-label="Проверка поиска скипетра"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {renderCheckPanel()}
            </section>
          </div>
        ), document.body) : null}
      </>
    );
  };

  const renderArchive = () => {
    const dialogue = penisuelaGalleryGameplay.dialogues.alexis;
    const prokhorTaskCompleted = Boolean(state.flags['alexis-prokhor-task-completed']);
    const dressingRoomKeyReceived = Boolean(state.flags['dressing-room-key-received']);
    const archiveStateKey = state.flags['archive-resolved']
      ? dressingRoomKeyReceived ? 'prokhor-rewarded' : prokhorTaskCompleted ? 'prokhor-returned' : 'resolved'
      : state.flags['alexis-smile-failed'] ? 'surveillance-ready' : 'opening';
    return (
      <SceneTextPanel className={styles.dialoguePanel} resetKey={`${activeScene.id}:${archiveStateKey}`}>
        <p className={styles.eyebrow}>Разговор · {dialogue.speaker}</p>
        <h1>{dressingRoomKeyReceived
          ? 'Ключ от гримёрки'
          : prokhorTaskCompleted
            ? 'Ответ для Алексис'
            : state.flags['archive-resolved'] ? 'Поручение Алексис'
          : state.flags['alexis-smile-failed'] ? 'Добровольного разговора не получилось' : 'Сначала объясните, кто вы'}</h1>
        <blockquote>
          {dressingRoomKeyReceived ? `${dialogue.prokhorReturn} ${dialogue.prokhorReward}`
            : prokhorTaskCompleted ? dialogue.prokhorReturn
              : state.flags['alexis-calmed'] ? dialogue.success
            : state.flags['alexis-surveillance-noticed'] ? dialogue.search
              : state.flags['alexis-smile-failed'] ? dialogue.pressure : dialogue.opening}
        </blockquote>
        {renderLastRoll()}
        {activeCheckId ? renderCheckPanel() : null}
        {!activeCheckId ? (
          <div className={styles.actions}>
            {state.flags['archive-resolved'] ? (
              <Link to="/campaign/penisuela/play/closed-bar">Отправиться в закрытый бар</Link>
            ) : null}
            <button className={styles.secondaryAction} type="button" onClick={() => controller.changeView('gallery')}>Вернуться в галерею</button>
          </div>
        ) : null}
      </SceneTextPanel>
    );
  };

  const renderKraken = () => (
    <SceneTextPanel className={styles.dialoguePanel} resetKey={activeScene.id}>
      <p className={styles.eyebrow}>{activeScene.eyebrow}</p>
      <h1>{activeScene.title}</h1>
      <p>{activeScene.readAloud}</p>
      {renderLastRoll()}
      {activeCheckId ? renderCheckPanel() : null}
    </SceneTextPanel>
  );

  const renderCombatArena = () => state.combat ? (
    <CombatEncounterHud
      combat={state.combat}
      definition={penisuelaGalleryGameplay}
      diceError={diceError}
      diceReady={isDiceReady}
      fallbackEnemyToken={activeScene.background}
      heroes={controller.sessionHeroes}
      heroHp={state.heroHp}
      participantTemporaryModifiers={state.participantTemporaryModifiers}
      participantConditions={Object.fromEntries(controller.sessionHeroes.map((hero) => [
        hero.id,
        controller.getParticipantConditions(hero.id),
      ]))}
      timelineEvents={state.events}
      inventoryState={state.inventoryState}
      heroPortraits={heroPortraits}
      heroTokens={heroAvatarPaths}
      inputValue={physicalRoll}
      isRolling={isDieRolling}
      onApplyDamage={controller.applyCombatDamage}
      onCancelPendingAttack={controller.cancelPendingCombatAttackWithRedButton}
      onDefeatFallback={controller.resolveCombatDefeatFallback}
      onContinue={() => {
        if (state.combat?.encounterId === 'prop-room-winding-carriers') {
          controller.clearCombat('prop-room');
          return;
        }
        controller.clearCombat(state.combat?.encounterId === 'hotel-vip-guards' ? 'guards' : 'gallery');
      }}
      onEnemyAttack={controller.enemyAttack}
      onEquipItem={controller.equipCombatItem}
        onHeroAttack={controller.heroAttack}
        onSummonedAllyAttack={controller.summonedAllyAttack}
        onResolveSavingThrow={controller.resolveCombatSavingThrow}
      onInputChange={updateRollInput}
      onResetDie={resetDie}
      onRoll={startDiceRoll}
      onSelectAction={controller.selectCombatAction}
      onUseAction={controller.useCombatAction}
      resourceUses={state.resourceUses}
      suggestedEnemyTargetId={controller.getNpcDecision(
        state.combat.initiativeOrder[state.combat.turnIndex] ?? '',
      )?.suggestion.targetIds[0]}
      victoryWordmark={resolveAsset('assets/concepts/campaigns/penisuela/ui/victory-wordmark.png')}
    />
  ) : null;
  const renderGuardsEncounter = () => {
    const defeated = state.flags['pussy-guards-defeated'];
    return (
      <SceneTextPanel className={styles.dialoguePanel} resetKey={activeScene.id}>
        <p className={styles.eyebrow}>{activeScene.eyebrow}</p>
        <h1>{activeScene.title}</h1>
        <p>{activeScene.readAloud}</p>
        {defeated ? (
          <div className={styles.actions}>
            <button type="button" onClick={() => controller.changeView('gallery')}>Вернуться в холл</button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button className={styles.dangerAction} type="button" onClick={() => controller.startCombat('hotel-vip-guards')}>Начать бой</button>
            <button className={styles.secondaryAction} type="button" onClick={() => controller.changeView('gallery')}>Вернуться в холл</button>
          </div>
        )}
      </SceneTextPanel>
    );
  };

  const renderClosedBar = () => (
    <SceneTextPanel className={styles.dialoguePanel} resetKey={activeScene.id}>
      <p className={styles.eyebrow}>След продолжается</p>
      <h1>Закрытый бар</h1>
      <p>{activeScene.readAloud}</p>
      <div className={styles.actions}>
        <button className={styles.secondaryAction} type="button" onClick={() => controller.changeView('gallery')}>Вернуться в галерею</button>
      </div>
    </SceneTextPanel>
  );

  const guardsVictoryIsFinal = state.flags['pussy-guards-defeated']
    && (state.activeView === 'guards' || state.activeView === 'pussy');
  const content = guardsVictoryIsFinal ? renderGuardsEncounter()
    : state.activeView === 'gallery' ? renderGallery()
    : state.activeView === 'pussy' ? renderPussy()
      : state.activeView === 'prop-room' ? renderPropRoom()
        : state.activeView === 'archive' ? renderArchive()
          : state.activeView === 'kraken' ? renderKraken()
            : state.activeView === 'guards' ? renderGuardsEncounter()
              : state.activeView === 'combat' ? renderCombatArena()
              : renderClosedBar();
  const propRoomQuestAccepted = Boolean(state.flags['pussy-quest-accepted'] || state.flags['vip-prop-room-open']);
  const propRoomCarriersAwakened = Boolean(state.flags['prop-room-carriers-awakened']);
  const propRoomCarriersDefeated = Boolean(state.flags['prop-room-carriers-defeated']);
  const propRoomForceOnly = Boolean(state.flags['prop-room-force-only']);
  const propRoomStrengthFailed = Boolean(state.flags['prop-room-strength-failed']);
  const scepterStrengthCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'recover-pussy-scepter')!;
  const scepterEngineeringCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'recover-pussy-scepter-with-engineering')!;
  const scepterLindaCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'recover-pussy-scepter-with-tiny-linda')!;
  const lindaKrakenCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'disable-rail-kraken-with-linda')!;
  const krakenStopCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'stop-rail-kraken')!;
  const alexisCalmCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'calm-alexis')!;
  const propRoomDecisionOptions = propRoomCarriersAwakened && !propRoomCarriersDefeated ? [
    {
      id: 'start-carriers-combat',
      label: 'Начать бой с заводными носильщиками',
      onSelect: () => controller.startCombat('prop-room-winding-carriers'),
    },
  ] : [
    ...(!propRoomForceOnly ? [{
      id: 'recover-scepter-with-linda',
      label: 'Линда: пройти через люк · Ловкость DC 15',
      onSelect: () => beginCheck(scepterLindaCheck, 'linda', 'dexterity'),
    }] : []),
    ...(!propRoomForceOnly ? [{
      id: 'recover-scepter-with-engineering',
      label: 'Ламберт: разгрузить лебёдку · Интеллект DC 15',
      onSelect: () => beginCheck(scepterEngineeringCheck, 'lambert', 'intelligence'),
    }] : []),
    ...(!propRoomStrengthFailed ? [{
      id: 'recover-scepter-with-strength',
      label: 'Головач Лена: поднять раму · Сила DC 18',
      onSelect: () => beginCheck(scepterStrengthCheck, 'golovach-lena', 'strength'),
    }] : []),
  ];
  const krakenDecisionOptions = [
    {
      id: 'disable-kraken-with-linda',
      label: 'Линда: проникнуть в привод · Ловкость DC 12',
      onSelect: () => beginCheck(lindaKrakenCheck, 'linda', 'dexterity'),
    },
    {
      id: 'stop-kraken-mechanism',
      label: 'Заклинить аварийный стопор · Сила DC 12',
      onSelect: () => beginCheck(krakenStopCheck, undefined, 'strength'),
    },
    {
      id: 'start-kraken-combat',
      label: 'Начать бой с рельсовым кракеном',
      onSelect: () => controller.startCombat(),
    },
  ];
  const alexisDecisionOptions = state.flags['alexis-smile-failed'] ? [
    {
      id: 'search-archive-with-video-surveillance',
      label: 'Головач: применить видеонаблюдение',
      disabled: (() => {
        const action = penisuelaGalleryGameplay.combatActions.find((candidate) => (
          candidate.characterId === 'golovach-lena' && candidate.sourceId === 'video-surveillance'
        ));
        return action ? (state.resourceUses[getCombatActionResourceKey(action)] ?? 0) >= action.uses.max : true;
      })(),
      onSelect: () => controller.resolveSceneCheck(
        'search-hotel-archive',
        'golovach-lena',
        'intelligence',
        undefined,
        'video-surveillance',
      ),
    },
  ] : [
    {
      id: 'calm-alexis-with-thorin',
      label: 'Торин: гипнотическая улыбка · Харизма DC 12',
      onSelect: () => beginCheck(alexisCalmCheck, 'thorin-pukoshchit', 'charisma'),
    },
  ];
  const pussyScepterReturnReady = state.activeView === 'pussy'
    && state.flags['pussy-quest-accepted']
    && state.flags['rail-kraken-resolved']
    && state.inventory.includes('pussy-sultan-golden-scepter-microphone')
    && !state.flags['scepter-returned'];
  const pussyRewardReady = state.activeView === 'pussy'
    && state.flags['scepter-returned']
    && !state.flags['pussy-reward-received'];
  const masterActions: SceneMasterAction[] = state.activeView === 'pussy' ? [
    ...(pussyScepterReturnReady ? [{
      id: 'return-pussy-scepter',
      label: 'Отдать скипетр',
      onSelect: controller.returnScepter,
    }] : pussyRewardReady ? [{
      id: 'grant-pussy-reward',
      label: 'Выдать награду',
      onSelect: beginPussyRewardPresentation,
    }] : !state.flags['scepter-returned'] && !state.flags['pussy-reward-received'] ? [{
      id: 'manage-pussy-dialogue',
      label: 'Управлять разговором',
      onSelect: () => setPussyGmPanelOpen(true),
    }] : []),
  ] : state.activeView === 'prop-room' ? [
    ...(propRoomQuestAccepted && !state.flags['scepter-recovered'] && !propRoomCarriersDefeated ? [
      {
        id: 'manage-prop-room',
        label: propRoomCarriersAwakened ? 'Управлять сценой' : 'Управлять поиском скипетра',
        onSelect: () => setPropRoomDecisionOpen(true),
      },
    ] : []),
  ] : state.activeView === 'kraken' && !activeCheckId ? [
    {
      id: 'manage-kraken',
      label: 'Управлять сценой с кракеном',
      onSelect: () => setKrakenDecisionOpen(true),
    },
  ] : state.activeView === 'archive'
    && state.flags['alexis-prokhor-task-completed']
    && !state.flags['dressing-room-key-received']
    ? [{
        id: 'complete-alexis-prokhor-task',
        label: 'Рассказать про Успенскую',
        onSelect: beginAlexisRewardPresentation,
      }]
    : state.activeView === 'archive' && !state.flags['archive-resolved'] && !activeCheckId ? [
      {
        id: 'manage-alexis',
        label: 'Управлять разговором',
        onSelect: () => setAlexisDecisionOpen(true),
      },
    ] : [];
  const masterStepBack = selectedDoorId
    ? () => setSelectedDoorId(null)
    : controller.canUndo ? controller.undoLastCommand : undefined;

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={penisuelaSessionPreview.campaignId}
      campaignScenes={penisuelaSessionPreview.scenes}
      backHref={state.activeView === 'gallery' ? '/campaign/penisuela/play/hotel-overload-search' : undefined}
      gameMasterConsole={(
        <GameMasterConsole
          campaignScenes={penisuelaSessionPreview.scenes}
          controller={controller}
          definition={penisuelaGalleryGameplay}
          scene={activeScene as CampaignSessionScene}
        />
      )}
      externalRevealedIds={acquiredInspectableIds}
      externallyManagedIds={controller.managedInspectableIds}
      masterActions={masterActions}
      onMasterStepBack={masterStepBack}
      scene={activeScene as CampaignSessionScene}
      interactiveContent={(
        <>
          {content}
          <SceneDecisionModal
            description={propRoomCarriersAwakened
              ? 'Силовой подъём сорван. Три заводных носильщика перекрыли паланкин; бой обязателен.'
              : propRoomForceOnly
                ? 'Тонкий способ заклинил механизм. Теперь доступна только силовая проверка Головача Лены.'
                : 'Выберите один из трёх способов. Провал Линды или Ламберта оставит только силовой путь; провал силы немедленно начнёт бой.'}
            eyebrow="Скрыто от игроков"
            onClose={() => setPropRoomDecisionOpen(false)}
            open={propRoomDecisionOpen}
            options={propRoomDecisionOptions}
            revealLabel={propRoomCarriersAwakened ? 'Показать действие мастера' : undefined}
            title={propRoomCarriersAwakened ? 'Реквизит проснулся' : 'Поиск скипетра'}
          />
          <SceneDecisionModal
            description="Выберите скрытый от игроков способ остановить декорацию. Решение появится на общем экране только после действия мастера."
            eyebrow="Скрыто от игроков"
            onClose={() => setKrakenDecisionOpen(false)}
            open={krakenDecisionOpen}
            options={krakenDecisionOptions}
            title="Кракен на рельсе"
          />
          <SceneDecisionModal
            description={state.flags['alexis-smile-failed']
              ? 'Алексис отказалась говорить добровольно. Резервный способ поиска появляется только после провала улыбки Торина и расходует видеонаблюдение Головача на эту локацию.'
              : 'Алексис слишком взвинчена для обычного разговора. Выбранное действие и его исход появятся на общем экране только после решения мастера.'}
            eyebrow="Скрыто от игроков"
            onClose={() => setAlexisDecisionOpen(false)}
            open={alexisDecisionOpen}
            options={alexisDecisionOptions}
            title="Разговор с Алексис"
          />
          <D20Roller
            diceExpression={activeDiceExpression}
            rollLabel={activeDiceLabel}
            requestId={dieRollRequestId}
            rolling={isDieRolling}
            selectionMode={activeDiceSelection}
            onReadyChange={setIsDiceReady}
            onResult={finishDiceRoll}
            onError={failDiceRoll}
          />
          {scepterModalOpen && scepterArtifact ? (
            <InspectableArtifactDialog
              artifact={scepterArtifact}
              onClose={() => setScepterModalOpen(false)}
            />
          ) : null}
          {activePussyRewardArtifact ? (
            <InspectableArtifactDialog
              artifact={activePussyRewardArtifact}
              onClose={closePussyRewardPresentation}
            />
          ) : null}
          {alexisRewardModalOpen && alexisDressingRoomKeyArtifact ? (
            <InspectableArtifactDialog
              artifact={alexisDressingRoomKeyArtifact}
              onClose={closeAlexisRewardPresentation}
            />
          ) : null}
        </>
      )}
    />
  );
}
