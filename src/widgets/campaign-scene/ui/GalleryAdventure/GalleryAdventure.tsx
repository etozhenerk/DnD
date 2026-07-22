import {useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router-dom';
import {
  penisuelaGalleryGameplay,
  penisuelaGalleryHeroes,
  penisuelaSessionPreview,
} from '../../../../entities/campaign-session/model/data';
import type {GalleryCheckDefinition, GalleryDoorDefinition, GalleryView, HeroStat} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {InspectableArtifactDialog} from '../../../../entities/campaign-session/ui/InspectableArtifactDialog/InspectableArtifactDialog';
import type {CombatPortraitPresentation} from '../../../../entities/combat/model/view';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {CombatEncounterHud} from '../CombatEncounterHud/CombatEncounterHud';
import styles from './GalleryAdventure.module.css';

const galleryManagedInspectableIds = [
  'pussy-sultan-golden-scepter-microphone',
  'pussy-sultan-womanizer',
  'closed-bar-token',
];

const statLabels: Record<HeroStat, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
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
        : flags['scepter-recovered'] ? 'hotel-gallery-pussy-return' : 'hotel-gallery-pussy'
    : view === 'prop-room' ? 'vip-prop-room'
        : view === 'archive' ? 'hotel-archive-alexis'
          : view === 'combat' && encounterId === 'hotel-vip-guards'
            ? 'hotel-vip-guards'
            : view === 'guards'
              ? flags['pussy-guards-defeated'] ? 'hotel-vip-guards-defeated' : 'hotel-vip-guards'
            : view === 'kraken' || view === 'combat' ? 'hotel-gallery-kraken'
            : 'closed-bar';
  const scene = penisuelaSessionPreview.scenes.find((item) => item.id === sceneId)
    ?? penisuelaSessionPreview.scenes.find((item) => item.id === 'hotel-gallery')!;
  return (view === 'pussy' || encounterId === 'hotel-vip-guards') && flags['pussy-lore-revealed'] && scene.id === 'hotel-gallery-pussy'
    ? {...scene, alt: 'Pussy Sultan в роскошном наряде встречает героев в разгромленной VIP-зоне отеля.'}
    : scene;
}

export function GalleryAdventure() {
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
  const [scepterModalOpen, setScepterModalOpen] = useState(false);
  const [isDieRolling, setIsDieRolling] = useState(false);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const [dieRollRequestId, setDieRollRequestId] = useState(0);
  const [diceError, setDiceError] = useState(false);
  const [activeDiceExpression, setActiveDiceExpression] = useState('1d20');
  const [activeDiceLabel, setActiveDiceLabel] = useState('Бросок d20');
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
  const activeCombatantId = state.combat?.initiativeOrder[state.combat.turnIndex];

  useEffect(() => {
    if (state.activeView === 'pussy') return;
    setPussyLoreOpen(false);
    setPussyGmPanelOpen(false);
    setPussyFallbacksOpen(false);
    setPussyQuestOfferOpen(false);
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
    setIsDieRolling(false);
    setPhysicalRoll('');
    setDiceError(false);
  };

  const startDiceRoll = (
    diceExpression = '1d20',
    diceLabel = 'Бросок d20',
  ) => {
    if (isDieRolling || !isDiceReady) return;
    setPhysicalRoll('');
    setActiveDiceExpression(diceExpression);
    setActiveDiceLabel(diceLabel);
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
    const result = controller.resolveSceneCheck(resolvedCheckId, selectedHeroId, selectedStat, rolls, abilityId);
    if (resolvedCheckId === 'earn-pussy-acquaintance' && result?.success) {
      setPussyLoreOpen(true);
    }
    if (resolvedCheckId === 'earn-pussy-trust') setPussyQuestOfferOpen(false);
    if (['earn-pussy-acquaintance', 'earn-pussy-trust', 'intimidate-pussy', 'steal-pussy-key'].includes(resolvedCheckId)) {
      setPussyGmPanelOpen(false);
    }
    if (resolvedCheckId === 'recover-pussy-scepter') setScepterModalOpen(true);
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
              onChange={(event) => updateRollInput(event.target.value)}
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
    setScepterModalOpen(false);
    resetDie();
    controller.resetSession();
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
        <div className={styles.legendPanel}>
          <p className={styles.eyebrow}>Мастер</p>
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
              <button type="button" onClick={() => controller.changeView('closed-bar')}>Продолжить по следу</button>
            </div>
          ) : null}
        </div>
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
      ? 'Скипетр снова в руке хозяина. Pussy Sultan устраивается среди подушек с видом человека, который только что лично восстановил мировой порядок.'
      : state.flags['pussy-guards-defeated']
        ? pussyLoreRevealed ? dialogue.guardsDefeated : dialogue.acquaintance
        : state.flags['pussy-intimidated']
          ? pussyLoreRevealed ? dialogue.threatSuccess : dialogue.threatSuccessAnonymous
          : state.flags['pussy-key-stolen']
            ? dialogue.theftSuccess
      : state.flags['scepter-recovered']
        ? 'Золотой скипетр вернулся из-под паланкина. Pussy Sultan протягивает раскрытую ладонь и терпеливо ждёт завершения церемонии.'
        : pussyQuestAccepted
          ? 'Pussy Sultan остаётся среди обломков балдахина и ждёт возвращения своей золотой регалии.'
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
        <button
          className={styles.gmAccessButton}
          data-label="Панель мастера"
          type="button"
          onClick={() => setPussyGmPanelOpen(true)}
          aria-label="Открыть панель мастера"
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M6 22 4 10l7 5 5-9 5 9 7-5-2 12H6Z" />
            <path d="M7 25h18" />
            <circle cx="16" cy="18" r="2" />
          </svg>
        </button>
        <div className={styles.dialoguePanel}>
        <p className={styles.eyebrow}>Разговор · {pussyLoreRevealed ? dialogue.speaker : 'незнакомец'}</p>
        <h1>{pussyLoreRevealed ? dialogue.speaker : 'Незнакомец у трона'}</h1>
        {!pussyAcquainted && !pussyQuestAccepted && !state.flags['scepter-recovered'] ? (
          <blockquote>{pussyAcquaintanceFailed ? dialogue.acquaintanceFailure : dialogue.opening}</blockquote>
        ) : (
          <p className={styles.characterStatus}>{publicStatus}</p>
        )}
        <div className={styles.actions}>
          {pussyLoreRevealed ? <button type="button" onClick={() => setPussyLoreOpen(true)}>Открыть лор Pussy Sultan</button> : null}
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
                      <button type="button" onClick={() => controller.changeView('gallery')}>Вернуться к дверям</button>
                    </div>
                  ) : null}
                  {(state.flags['pussy-intimidated'] || state.flags['pussy-guards-defeated']) ? (
                    <div className={styles.gmChoices}>
                      <p>Pussy Sultan рассказал всё, что помнит, и отдал ключ. Ветка доверия, поручение и Вуманайзер закрыты.</p>
                      <button type="button" onClick={() => controller.changeView('gallery')}>Вернуться к дверям</button>
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
                      <button type="button" onClick={() => controller.changeView('gallery')}>Вернуть героев в галерею</button>
                    </div>
                  ) : null}
                  {state.flags['scepter-recovered'] && !state.flags['pussy-reward-received'] ? (
                    <div className={styles.gmChoices}>
                      <p>Отыграй благодарность, упоминание Головач Лены и подарок. Затем выдай ключ и предмет.</p>
                      <button type="button" onClick={controller.returnScepter}>Выдать ключ и награду</button>
                    </div>
                  ) : null}
                  {state.flags['pussy-reward-received'] ? (
                    <div className={styles.gmChoices}>
                      <p>Награда выдана, ключ от центральной двери находится у героев.</p>
                      <button type="button" onClick={() => controller.changeView('gallery')}>Продолжить в галерее</button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        ), document.body) : null}
        </div>
      </>
    );
  };

  const renderPropRoom = () => {
    const check = penisuelaGalleryGameplay.checks.find((item) => item.id === 'recover-pussy-scepter')!;
    const pussyQuestAccepted = Boolean(state.flags['pussy-quest-accepted'] || state.flags['vip-prop-room-open']);
    return (
      <div className={styles.dialoguePanel}>
        <p className={styles.eyebrow}>{pussyQuestAccepted ? 'Поиск предмета' : 'Осмотр'} · верхняя галерея</p>
        <h1>{pussyQuestAccepted ? 'Скипетр под паланкином' : 'Забытый паланкин'}</h1>
        <p>{state.flags['scepter-recovered']
          ? 'Скипетр лежит у вас в инвентаре. Из глубины отеля доносится тяжёлый лязг: внизу по медному рельсу уже движется что-то слишком большое для утренней уборки.'
          : pussyQuestAccepted
          ? 'Теперь описание Pussy Sultan совпадает с увиденным: золотое древко зажато между мрамором и опрокинутой рамой. Выберите героя и способ освободить его.'
          : 'Наверху пахнет пылью, цветами и вчерашним праздником. Опрокинутый паланкин лежит среди корон, чехлов и стоек; под его рамой поблёскивает золотое древко, но пока это лишь одна из десятков чужих вещей без имени и истории.'}</p>
        {state.flags['scepter-recovered'] ? (
          <div className={styles.actions}>
            <button type="button" onClick={() => controller.changeView('gallery')}>Спуститься в галерею</button>
          </div>
        ) : pussyQuestAccepted && activeCheckId ? renderCheckPanel() : pussyQuestAccepted ? (
          <div className={styles.actions}>
            <button type="button" onClick={() => beginCheck(check, undefined, 'strength')}>Поднять паланкин</button>
            <button type="button" onClick={() => beginCheck(check, undefined, 'dexterity')}>Вытащить скипетр осторожно</button>
            <button className={styles.secondaryAction} type="button" onClick={() => controller.changeView('gallery')}>Вернуться в галерею</button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button className={styles.secondaryAction} type="button" onClick={() => controller.changeView('gallery')}>Вернуться в галерею</button>
          </div>
        )}
      </div>
    );
  };

  const renderArchive = () => {
    const dialogue = penisuelaGalleryGameplay.dialogues.alexis;
    const calmCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'calm-alexis')!;
    const searchCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'search-hotel-archive')!;
    const thorinUsed = state.usedAbilities.includes('hypnotic-smile');
    const sarcasmUsed = state.usedAbilities.includes('sarcasm');
    return (
      <div className={styles.dialoguePanel}>
        <p className={styles.eyebrow}>Разговор · {dialogue.speaker}</p>
        <h1>{state.flags['archive-resolved'] ? 'След в счетах' : 'Сначала объясните, кто вы'}</h1>
        <blockquote>
          {state.flags['alexis-calmed'] ? dialogue.success
            : state.flags['archive-resolved'] ? dialogue.search
              : state.flags['alexis-refused'] ? dialogue.pressure : dialogue.opening}
        </blockquote>
        {renderLastRoll()}
        {activeCheckId ? renderCheckPanel() : (
          <div className={styles.actions}>
            {!state.flags['archive-resolved'] && !state.flags['alexis-refused'] ? (
              <>
                <button type="button" onClick={() => beginCheck(calmCheck, undefined, 'charisma')}>Объяснить спокойно</button>
                <button
                  type="button"
                  disabled={thorinUsed}
                  onClick={() => controller.resolveSceneCheck('calm-alexis', 'thorin-pukoshchit', 'charisma', undefined, 'hypnotic-smile')}
                >
                  Торин: гипнотическая улыбка
                </button>
                <button
                  type="button"
                  disabled={sarcasmUsed}
                  onClick={() => {
                    controller.resolveSceneCheck('calm-alexis', 'lambert', 'charisma', undefined, 'sarcasm');
                  }}
                >
                  Ламберт: сарказм с преимуществом
                </button>
                <button className={styles.secondaryAction} type="button" onClick={controller.pressureAlexis}>Надавить на Алексиса</button>
              </>
            ) : null}
            {state.flags['alexis-refused'] && !state.flags['archive-resolved'] ? (
              <button type="button" onClick={() => beginCheck(searchCheck, undefined, 'intelligence')}>Искать маршрут в счетах</button>
            ) : null}
            {state.flags['archive-resolved'] ? (
              <button type="button" onClick={() => controller.changeView('gallery')}>Вернуться в галерею</button>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const renderKraken = () => {
    const stopCheck = penisuelaGalleryGameplay.checks.find((item) => item.id === 'stop-rail-kraken')!;
    return (
      <div className={styles.dialoguePanel}>
        <p className={styles.eyebrow}>Опасность · Рельсовый кракен</p>
        <h1>Красная линия вспыхивает</h1>
        <p>Стоит вам ступить на нижнюю площадку со скипетром, как медный рельс вспыхивает красным. Гостиница сочла вынесенную регалию пропажей: фанерный кракен срывается с креплений и идёт наперерез. Можно послать Линду в сервисный люк, остановить общий механизм или принять бой в инициативе.</p>
        {renderLastRoll()}
        {activeCheckId ? renderCheckPanel() : (
          <div className={styles.actions}>
            <button type="button" onClick={controller.disableKrakenWithLinda}>Линда: уменьшиться и войти в люк</button>
            <button type="button" onClick={() => beginCheck(stopCheck, undefined, 'intelligence')}>Остановить общий механизм</button>
            <button className={styles.dangerAction} type="button" onClick={() => controller.startCombat()}>Вступить в бой</button>
          </div>
        )}
      </div>
    );
  };

  const renderCombatArena = () => state.combat ? (
    <CombatEncounterHud
      combat={state.combat}
      definition={penisuelaGalleryGameplay}
      diceError={diceError}
      diceReady={isDiceReady}
      fallbackEnemyToken={activeScene.background}
      heroes={penisuelaGalleryHeroes}
      heroHp={state.heroHp}
      heroPortraits={heroPortraits}
      heroTokens={heroAvatarPaths}
      inputValue={physicalRoll}
      isRolling={isDieRolling}
      onApplyDamage={controller.applyCombatDamage}
      onContinue={() => controller.changeView(
        state.combat?.encounterId === 'hotel-vip-guards' ? 'guards' : 'gallery',
      )}
      onEnemyAttack={controller.enemyAttack}
      onEquipItem={controller.equipCombatItem}
      onHeroAttack={controller.heroAttack}
      onInputChange={updateRollInput}
      onReset={resetAdventure}
      onResetDie={resetDie}
      onRoll={startDiceRoll}
      onSelectAction={controller.selectCombatAction}
      onUndo={controller.undoLastCommand}
      onUseAction={controller.useCombatAction}
      victoryWordmark={resolveAsset('assets/concepts/campaigns/penisuela/ui/victory-wordmark.png')}
    />
  ) : null;
  const renderGuardsEncounter = () => {
    const defeated = state.flags['pussy-guards-defeated'];
    return (
      <div className={styles.dialoguePanel}>
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
          </div>
        )}
      </div>
    );
  };

  const renderClosedBar = () => (
    <div className={styles.dialoguePanel}>
      <p className={styles.eyebrow}>След продолжается</p>
      <h1>Закрытый бар</h1>
      <p>{activeScene.readAloud}</p>
      <div className={styles.actions}>
        <Link to="/campaign/penisuela/play/closed-bar">Осмотреть бар</Link>
        <button className={styles.secondaryAction} type="button" onClick={() => controller.changeView('gallery')}>Вернуться в галерею</button>
      </div>
    </div>
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

  return (
    <CampaignScene
      campaignId={penisuelaSessionPreview.campaignId}
      campaignScenes={penisuelaSessionPreview.scenes}
      backHref={state.activeView === 'gallery' ? '/campaign/penisuela/play/hotel-overload-search' : undefined}
      backLabel="← Вернуться в номер"
      externalRevealedIds={acquiredInspectableIds}
      externallyManagedIds={galleryManagedInspectableIds}
      scene={activeScene as CampaignSessionScene}
      interactiveContent={(
        <>
          {state.activeView !== 'combat' ? (
            <div className={styles.sessionHud}>
              <button type="button" onClick={controller.undoLastCommand}>Отменить ход</button>
              <button type="button" onClick={resetAdventure}>Начать сцену заново</button>
            </div>
          ) : null}
          {content}
          <D20Roller
            diceExpression={activeDiceExpression}
            rollLabel={activeDiceLabel}
            requestId={dieRollRequestId}
            rolling={isDieRolling}
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
        </>
      )}
    />
  );
}
