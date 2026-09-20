import {useEffect, useMemo, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {
  areAllHeroesDown,
  getFinalBossDamageRange,
  getFinalBossEffectiveAttackBonus,
  getFinalBossPhase,
  getFinalBossPlanDc,
  getFinalBossRuntimeAttackBonus,
  isFinalBossPlanAvailable,
  isFinalBossD20,
  resolveFinalBossAttackRoll,
  resolveFinalBossDamageRoll,
  resolveFinalBossPlanCheck,
  resolveFinalBossSavingThrow,
} from '../../../../entities/final-boss/model/finalBossRules';
import {
  penisuelaFinalBoss,
  penisuelaFinalBossGameplay,
} from '../../../../entities/final-boss/model/data';
import type {
  FinalBossEnemyTurnRollInput,
  FinalBossPlanReactionInput,
  FinalBossSavingThrowTurnInput,
  FinalBossStrikeRollInput,
} from '../../../../entities/final-boss/model/finalBossRules';
import type {FinalBossPlanDefinition} from '../../../../entities/final-boss/model/types';
import {
  penisuelaGalleryHeroes,
} from '../../../../entities/campaign-session/model/playableData';
import {resolveNextFormalActionConditions} from '../../../../entities/campaign-session/model/conditionRules';
import type {HeroStat} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {formatDamageCalculation, formatDiceExpression, getDamageRoll} from '../../../../shared/lib/dice/diceExpression';
import type {DiceSelectionMode} from '../../../../shared/lib/dice/diceSelection';
import {useManualCriticalRollEffect} from '../../../../shared/lib/dice/useManualCriticalRollEffect';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {CampaignScene} from '../CampaignScene/CampaignScene';
import {CombatEncounterHud} from '../CombatEncounterHud/CombatEncounterHud';
import {GameMasterConsole} from '../GameMasterConsole/GameMasterConsole';
import styles from './FinalBossAdventure.module.css';

interface FinalBossAdventureProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  scene: CampaignSessionScene;
}

type ConsoleMode = 'initiative' | 'channel' | 'plan' | 'enemy' | null;

const statLabels: Record<HeroStat, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  wisdom: 'Мудрость',
  intelligence: 'Интеллект',
  charisma: 'Харизма',
};

const heroTokens: Record<string, string> = {
  bubsilda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/bubsilda.png',
  linda: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/linda.png',
  lambert: 'assets/concepts/campaigns/penisuela/ui/hero-tokens/lambert.png',
  'golovach-lena': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/golovach-lena.png',
  'thorin-pukoshchit': 'assets/concepts/campaigns/penisuela/ui/hero-tokens/thorin-pukoshchit.png',
};

function isValidD20(value: string) {
  const roll = Number(value);
  return Number.isInteger(roll) && roll >= 1 && roll <= 20;
}

function isHeroStat(stat: string): stat is HeroStat {
  return stat === 'strength'
    || stat === 'dexterity'
    || stat === 'wisdom'
    || stat === 'intelligence'
    || stat === 'charisma';
}

function getPlanHeroStats(plan: FinalBossPlanDefinition): HeroStat[] {
  return plan.check?.stats.filter(isHeroStat) ?? [];
}

function getInitialPlanId(flags: Record<string, boolean>): FinalBossPlanDefinition['id'] {
  if (flags['final-plan-standard']) return 'standard';
  if (flags['final-plan-director']) return 'director';
  return 'physical';
}

function getEndingSceneId(endingId: string | null) {
  return penisuelaFinalBoss.plans.find((plan) => plan.endingId === endingId)?.epilogueSceneId
    ?? penisuelaFinalBoss.defeatFallback.epilogueSceneId;
}

function numericInput(value: string) {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function rawDamageExpression(expression: string, critical = false) {
  const damage = getDamageRoll(expression, critical);
  return damage ? formatDiceExpression(damage, false) : expression;
}

export function FinalBossAdventure({
  campaignId,
  campaignScenes,
  scene,
}: FinalBossAdventureProps) {
  const navigate = useNavigate();
  const legacySceneIds = useMemo(() => campaignScenes.map((item) => item.id), [campaignScenes]);
  const controller = useGallerySession(
    penisuelaFinalBossGameplay,
    penisuelaGalleryHeroes,
    legacySceneIds,
  );
  const {state} = controller;
  const combat = state.combat?.encounterId === penisuelaFinalBoss.encounter.id
    ? state.combat
    : null;
  const boss = combat?.enemies[penisuelaFinalBoss.encounter.id];
  const phase = getFinalBossPhase(penisuelaFinalBoss, boss?.hp ?? penisuelaFinalBoss.encounter.hp);
  const activeCombatantId = combat?.initiativeOrder[combat.turnIndex] ?? '';
  const activeHero = controller.sessionHeroes.find((hero) => hero.id === activeCombatantId);
  const activeEnemy = combat?.enemies[activeCombatantId];
  const allHeroesDown = Boolean(combat) && areAllHeroesDown(
    state.heroHp,
    penisuelaGalleryHeroes.map((hero) => hero.id),
  );
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<FinalBossPlanDefinition['id']>(
    () => getInitialPlanId(state.flags),
  );
  const [selectedStat, setSelectedStat] = useState<HeroStat>('intelligence');
  const [rollInput, setRollInput] = useState('');
  const [combatRollInput, setCombatRollInput] = useState('');
  const [useClearChoiceConfirmation, setUseClearChoiceConfirmation] = useState(false);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [isDieRolling, setIsDieRolling] = useState(false);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const [diceError, setDiceError] = useState(false);
  const [dieRollRequestId, setDieRollRequestId] = useState(0);
  const [diceExpression, setDiceExpression] = useState('1d20');
  const [diceLabel, setDiceLabel] = useState('Бросок d20');
  const [diceSelection, setDiceSelection] = useState<DiceSelectionMode>('sum');
  const [diceResultKey, setDiceResultKey] = useState('main');
  const [explicitRollInputs, setExplicitRollInputs] = useState<Record<string, string>>({});
  const {commitManualRoll, markManualRoll, resetManualRoll} = useManualCriticalRollEffect();

  const selectedPlan = penisuelaFinalBoss.plans.find((plan) => plan.id === selectedPlanId)
    ?? penisuelaFinalBoss.plans[2];
  const selectedPlanAvailable = isFinalBossPlanAvailable(selectedPlan, {
    flags: state.flags,
    counters: state.counters,
  });
  const selectedPlanDc = boss
    ? getFinalBossPlanDc(
      penisuelaFinalBoss,
      selectedPlan,
      boss.hp,
      selectedPlan.id === 'director',
    )
    : null;
  const availableTargets = controller.sessionHeroes.filter((hero) => (state.heroHp[hero.id] ?? 0) > 0);
  const requiredTargets = Math.min(phase.attack.targets, availableTargets.length);
  const effectiveTargetIds = targetIds
    .filter((targetId, index, values) => (
      availableTargets.some((hero) => hero.id === targetId)
      && (!phase.attack.distinctTargets || values.indexOf(targetId) === index)
    ))
    .slice(0, requiredTargets);
  const behaviorSuggestedTargetIds = boss
    ? controller.getNpcDecision(boss.id)?.suggestion.targetIds.filter((targetId) => (
      availableTargets.some((hero) => hero.id === targetId)
    )) ?? []
    : [];
  const suggestedTargetIds = behaviorSuggestedTargetIds.length === requiredTargets
    ? behaviorSuggestedTargetIds
    : availableTargets
      .slice()
      .sort((left, right) => (
        (state.heroHp[right.id] ?? 0) - (state.heroHp[left.id] ?? 0)
        || left.id.localeCompare(right.id)
      ))
      .slice(0, requiredTargets)
      .map((hero) => hero.id);
  const resolvedTargetIds = effectiveTargetIds.length === requiredTargets
    ? effectiveTargetIds
    : suggestedTargetIds;
  const dynamicScene: CampaignSessionScene = {
    ...scene,
    alt: `Фаза ${phase.number} «${phase.name}»: пять героев действуют вокруг активного кольца свадебного алтаря.`,
    background: phase.background,
    readAloud: phase.readAloud,
  };
  const acquiredInspectableIds = state.inventory.filter((itemId) => campaignScenes.some(
    (campaignScene) => campaignScene.inspectables.some((item) => item.id === itemId),
  ));
  const clearChoiceAvailable = state.inventory.includes('clear-choice-confirmation')
    && (state.itemCharges['clear-choice-confirmation'] ?? 0) > 0;
  const initiativeParticipants = [
    ...controller.sessionHeroes.map((hero) => ({
      id: hero.id,
      name: hero.name,
      modifier: (hero.stats.dexterity ?? 0) + (state.participantTemporaryModifiers[hero.id] ?? 0),
    })),
    {
      id: penisuelaFinalBoss.encounter.id,
      name: penisuelaFinalBoss.encounter.name,
      modifier: penisuelaFinalBoss.encounter.initiative,
    },
  ];
  const initiativeRolls = Object.fromEntries(initiativeParticipants.map((participant) => [
    participant.id,
    numericInput(explicitRollInputs[`initiative:${participant.id}`] ?? ''),
  ]));
  const initiativeReady = initiativeParticipants.every((participant) => (
    isFinalBossD20(initiativeRolls[participant.id])
  ));
  const activeHeroTemporaryModifier = activeHero
    ? state.participantTemporaryModifiers[activeHero.id] ?? 0
    : 0;
  const activeHeroConditions = activeHero ? [
    ...(state.participantConditions[activeHero.id] ?? []),
    ...(state.flags[`show18-shamed-${activeHero.id}`] ? ['shamed'] : []),
    ...(state.flags[`show18-assigned-role-${activeHero.id}`] ? ['assigned-role'] : []),
  ] : [];
  const activeHeroConditionResolution = resolveNextFormalActionConditions(activeHeroConditions);
  const bossConditionResolution = resolveNextFormalActionConditions(
    boss ? state.participantConditions[boss.id] ?? [] : [],
  );
  const planModifier = activeHero
    ? (activeHero.stats[selectedStat] ?? 0)
      + activeHeroTemporaryModifier
      + activeHeroConditionResolution.rollModifier
      + (useClearChoiceConfirmation ? 2 : 0)
    : 0;
  const planNatural = numericInput(rollInput);
  const planPreview = boss && selectedPlan.check && isFinalBossD20(planNatural)
    ? resolveFinalBossPlanCheck(
        penisuelaFinalBoss,
        selectedPlan,
        boss.hp,
        planModifier,
        planNatural,
      )
    : null;
  const channelDc = penisuelaFinalBoss.encounter.weakness.dc;
  const channelPreview = isFinalBossD20(planNatural)
    ? resolveFinalBossSavingThrow(planNatural, planModifier, channelDc)
    : null;
  const egorikRerollAvailable = Boolean(
    state.flags['egorik-nastya-allies']
    && !state.flags['egorik-nastya-final-reroll-used'],
  );
  const channelRerollNatural = numericInput(explicitRollInputs['channel-reroll'] ?? '');
  const channelRerollPreview = isFinalBossD20(channelRerollNatural)
    ? resolveFinalBossSavingThrow(channelRerollNatural, planModifier, channelDc)
    : null;
  const reactionNatural = numericInput(explicitRollInputs['plan-reaction-attack'] ?? '');
  const reactionBonus = boss
    ? getFinalBossEffectiveAttackBonus(
        6,
        getFinalBossRuntimeAttackBonus(penisuelaFinalBoss, phase.number),
        boss.attack.bonus,
        (state.participantTemporaryModifiers[boss.id] ?? 0) + bossConditionResolution.rollModifier,
      )
    : 6;
  const reactionPreview = activeHero && isFinalBossD20(reactionNatural)
    ? resolveFinalBossAttackRoll(reactionNatural, reactionBonus, activeHero.ac)
    : null;
  const reactionDamageRaw = numericInput(explicitRollInputs['plan-reaction-damage'] ?? '');
  const reactionDamagePreview = reactionPreview?.hit
    ? resolveFinalBossDamageRoll('1d6+3', reactionPreview.critical, reactionDamageRaw)
    : null;
  const planReactionReady = Boolean(
    planPreview?.success
    || bossConditionResolution.blocked
    || (reactionPreview && (!reactionPreview.hit || reactionDamagePreview)),
  );
  const channelRerollRequired = Boolean(
    channelPreview && !channelPreview.success && egorikRerollAvailable,
  );
  const channelReady = Boolean(
    channelPreview && (!channelRerollRequired || channelRerollPreview),
  );

  const enemyStrikes = resolvedTargetIds.map((targetId, index) => ({
    targetId,
    attack: index > 0 && phase.attack.secondaryAttack
      ? phase.attack.secondaryAttack
      : phase.attack,
  }));
  const enemyStrikePreviews = enemyStrikes.map(({targetId, attack}, index) => {
    const target = controller.sessionHeroes.find((hero) => hero.id === targetId);
    const natural = numericInput(explicitRollInputs[`enemy-attack:${index}`] ?? '');
    const bonus = boss
      ? getFinalBossEffectiveAttackBonus(
          attack.bonus,
          getFinalBossRuntimeAttackBonus(penisuelaFinalBoss, phase.number),
          boss.attack.bonus,
          (state.participantTemporaryModifiers[boss.id] ?? 0) + bossConditionResolution.rollModifier,
        )
      : attack.bonus;
    const attackResolution = target && isFinalBossD20(natural)
      ? resolveFinalBossAttackRoll(natural, bonus, target.ac)
      : null;
    const rawDamage = numericInput(explicitRollInputs[`enemy-damage:${index}`] ?? '');
    const damageResolution = attackResolution?.hit
      ? resolveFinalBossDamageRoll(attack.damage, attackResolution.critical, rawDamage)
      : null;
    return {attack, attackResolution, bonus, damageResolution, index, natural, target};
  });
  const enemyStrikesReady = enemyStrikePreviews.length === requiredTargets
    && enemyStrikePreviews.every(({attackResolution, damageResolution}) => (
      attackResolution && (!attackResolution.hit || damageResolution)
    ));
  const dragonfireDamageRaw = numericInput(explicitRollInputs['dragonfire-damage'] ?? '');
  const dragonfireDamage = phase.attack.savingThrow
    ? resolveFinalBossDamageRoll(phase.attack.damage, false, dragonfireDamageRaw)
    : null;
  const dragonfireSaves = availableTargets.map((hero) => ({
    hero,
    natural: numericInput(explicitRollInputs[`dragonfire-save:${hero.id}`] ?? ''),
  }));
  const dragonfireReady = Boolean(dragonfireDamage)
    && dragonfireSaves.every(({natural}) => isFinalBossD20(natural));
  const visibleGameplayDefinition = {
    ...penisuelaFinalBossGameplay,
    encounters: penisuelaFinalBossGameplay.encounters.map((encounter) => encounter.id !== penisuelaFinalBoss.encounter.id
      ? encounter
      : {
          ...encounter,
          heroAttacks: encounter.heroAttacks.map((attack) => {
            const conditions = [
              ...(state.participantConditions[attack.characterId] ?? []),
              ...(state.flags[`show18-shamed-${attack.characterId}`] ? ['shamed'] : []),
              ...(state.flags[`show18-assigned-role-${attack.characterId}`] ? ['assigned-role'] : []),
            ];
            return {
              ...attack,
              bonus: (state.heroAttackBonuses[attack.characterId] ?? attack.bonus)
                + (state.participantTemporaryModifiers[attack.characterId] ?? 0)
                + resolveNextFormalActionConditions(conditions).rollModifier,
            };
          }),
        }),
  };

  useEffect(() => {
    if (!combat) return;
    resetManualRoll();
    setExplicitRollInputs({});
    setRollInput('');
    setCombatRollInput('');
    setDiceError(false);
  }, [activeCombatantId, combat?.round, phase.id, resetManualRoll]);

  const requestDiceRoll = (
    expression: string,
    label: string,
    resultKey = 'main',
    selectionMode: DiceSelectionMode = 'sum',
  ) => {
    resetManualRoll(resultKey);
    if (resultKey === 'main') setRollInput('');
    else if (resultKey === 'combat') setCombatRollInput('');
    else setExplicitRollInputs((current) => ({...current, [resultKey]: ''}));
    setDiceExpression(expression);
    setDiceLabel(label);
    setDiceSelection(selectionMode);
    setDiceResultKey(resultKey);
    setDiceError(false);
    setIsDieRolling(true);
    setDieRollRequestId((current) => current + 1);
  };

  const closeConsole = () => {
    resetManualRoll();
    setConsoleMode(null);
    setRollInput('');
    setDiceError(false);
    setUseClearChoiceConfirmation(false);
    setExplicitRollInputs({});
  };

  const openPlanConsole = () => {
    resetManualRoll('main');
    const nextPlanId = getInitialPlanId(state.flags);
    const nextPlan = penisuelaFinalBoss.plans.find((plan) => plan.id === nextPlanId)
      ?? penisuelaFinalBoss.plans[2];
    setSelectedPlanId(nextPlanId);
    setSelectedStat(getPlanHeroStats(nextPlan)[0] ?? 'intelligence');
    setConsoleMode('plan');
    setRollInput('');
  };

  const startFinalBoss = () => {
    if (!initiativeReady) return;
    if (controller.startFinalBoss(initiativeRolls)) closeConsole();
  };

  const resolvePlan = () => {
    if (
      !combat
      || !boss
      || !activeHero
      || !selectedPlan.check
      || !selectedPlanAvailable
      || !selectedPlan.check.stats.includes(selectedStat)
      || (!activeHeroConditionResolution.blocked && (
        !isValidD20(rollInput)
        || !planReactionReady
      ))
    ) return;
    const reaction: FinalBossPlanReactionInput | undefined = planPreview?.success ? undefined : {
      natural: reactionNatural,
      ...(reactionPreview?.hit ? {rawDamage: reactionDamageRaw} : {}),
    };
    if (controller.resolveFinalBossPlan(
      selectedPlan.id,
      activeHero.id,
      selectedStat,
      activeHeroConditionResolution.blocked ? Number.NaN : Number(rollInput),
      useClearChoiceConfirmation,
      reaction,
    )) closeConsole();
  };

  const resolveChannel = () => {
    if (
      !activeHero
      || (!activeHeroConditionResolution.blocked && (!isValidD20(rollInput) || !channelReady))
    ) return;
    if (controller.resolveFinalBossChannel(
      activeHero.id,
      selectedStat,
      activeHeroConditionResolution.blocked ? Number.NaN : Number(rollInput),
      useClearChoiceConfirmation,
      channelRerollRequired ? channelRerollNatural : undefined,
    )) closeConsole();
  };

  const resolveEnemyTurn = () => {
    if (!phase.attack.savingThrow) {
      if (!enemyStrikesReady) return;
      const strikes: FinalBossStrikeRollInput[] = enemyStrikePreviews.map((preview) => ({
        targetId: preview.target?.id ?? '',
        natural: preview.natural,
        ...(preview.attackResolution?.hit
          ? {rawDamage: numericInput(explicitRollInputs[`enemy-damage:${preview.index}`] ?? '')}
          : {}),
      }));
      const rollResolution: FinalBossEnemyTurnRollInput = {kind: 'attacks', strikes};
      if (controller.resolveFinalBossEnemyTurn(resolvedTargetIds, rollResolution)) {
        closeConsole();
        setTargetIds([]);
      }
      return;
    }
    if (!dragonfireReady) return;
    const savingThrowInput: FinalBossSavingThrowTurnInput = {
      rawDamage: dragonfireDamageRaw,
      saves: dragonfireSaves.map(({hero, natural}) => ({heroId: hero.id, natural})),
    };
    const rollResolution: FinalBossEnemyTurnRollInput = {
      kind: 'saving-throws',
      resolution: savingThrowInput,
    };
    if (controller.resolveFinalBossEnemyTurn(resolvedTargetIds, rollResolution)) {
      closeConsole();
      setTargetIds([]);
    }
  };

  const continueToEpilogue = () => {
    const endingSceneId = getEndingSceneId(state.selectedEnding);
    controller.clearCombat('gallery');
    navigate(`/campaign/${campaignId}/play/${endingSceneId}`);
  };

  let interactiveContent;
  if (!combat) {
    const endingSceneId = state.selectedEnding ? getEndingSceneId(state.selectedEnding) : null;
    interactiveContent = (
      <>
        <SceneTextPanel className={styles.introduction} resetKey={`${scene.id}:${state.events.length}`}>
          <p className={styles.eyebrow}>{endingSceneId ? 'Последний контур закрыт' : scene.eyebrow}</p>
          <h1>{endingSceneId ? 'Исход уже зафиксирован' : scene.title}</h1>
          <p className={styles.readAloud}>{endingSceneId
            ? 'Модуль больше не атакует. Осталось перейти к последствиям выбранного способа отключения.'
            : state.flags['final-boss-started']
              ? 'Стартовая реплика модуля зафиксирована. Бой начнётся только после шести явных d20 инициативы — пяти героев и Последнего дубля.'
              : scene.readAloud}</p>
          {endingSceneId ? (
            <Link className={styles.primaryAction} to={`/campaign/${campaignId}/play/${endingSceneId}`}>
              Открыть эпилог
            </Link>
          ) : (
            <button
              className={styles.primaryAction}
              type="button"
              onClick={() => {
                setExplicitRollInputs({});
                setConsoleMode('initiative');
              }}
            >
              {state.flags['final-boss-started']
                ? 'Ввести 6 бросков инициативы'
                : 'Подготовить инициативу'}
            </button>
          )}
        </SceneTextPanel>
        {consoleMode === 'initiative' ? (
          <div className={styles.consoleBackdrop} role="presentation">
            <section className={styles.checkConsole} role="dialog" aria-modal="true" aria-label="Инициатива Последнего дубля">
              <div className={styles.consoleHeading}>
                <div>
                  <span>Явные d20 · физические или цифровые</span>
                  <h2>Инициатива Последнего дубля</h2>
                </div>
                <button type="button" onClick={closeConsole} aria-label="Закрыть консоль">×</button>
              </div>
              <p className={styles.planDescription}>
                Введите физический d20 каждого участника или бросьте цифровой. В журнал попадут все исходные числа, модификаторы и итоговый порядок.
              </p>
              <div className={styles.explicitRollGrid}>
                {initiativeParticipants.map((participant) => {
                  const key = `initiative:${participant.id}`;
                  return (
                    <div className={styles.explicitRollRow} key={participant.id}>
                      <label>
                        <span>{participant.name} · d20 {participant.modifier >= 0 ? '+' : '−'} {Math.abs(participant.modifier)}</span>
                        <input
                          aria-label={`Физический d20 инициативы: ${participant.name}`}
                          max="20"
                          min="1"
                          type="number"
                          value={explicitRollInputs[key] ?? ''}
                          onBlur={() => commitManualRoll(key, explicitRollInputs[key] ?? '')}
                          onChange={(event) => {
                            markManualRoll(key);
                            setExplicitRollInputs((current) => ({...current, [key]: event.target.value}));
                          }}
                        />
                      </label>
                      <button
                        disabled={isDieRolling || !isDiceReady}
                        type="button"
                        onClick={() => requestDiceRoll('1d20', `Инициатива: ${participant.name}`, key)}
                      >
                        Цифровой d20
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className={styles.checkActions}>
                <button disabled={!initiativeReady || isDieRolling} type="button" onClick={startFinalBoss}>
                  Зафиксировать инициативу и начать бой
                </button>
              </div>
              {diceError ? <p className={styles.diceError}>3D-кубик недоступен: введите физический результат вручную.</p> : null}
            </section>
          </div>
        ) : null}
      </>
    );
  } else {
    interactiveContent = (
      <>
        <CombatEncounterHud
          combat={combat}
          customEnemyTurn
          definition={visibleGameplayDefinition}
          diceError={diceError}
          diceReady={isDiceReady}
          fallbackEnemyToken={phase.background}
          heroes={controller.sessionHeroes}
          heroHp={state.heroHp}
          participantTemporaryModifiers={state.participantTemporaryModifiers}
          participantConditions={Object.fromEntries(controller.sessionHeroes.map((hero) => [
            hero.id,
            controller.getParticipantConditions(hero.id),
          ]))}
          timelineEvents={state.events}
          inventoryState={state.inventoryState}
          heroTokens={heroTokens}
          inputValue={combatRollInput}
          isRolling={isDieRolling}
          onApplyDamage={controller.applyCombatDamage}
          onCancelPendingAttack={controller.cancelPendingCombatAttackWithRedButton}
          onContinue={continueToEpilogue}
          onEnemyAttack={controller.enemyAttack}
          onEquipItem={controller.equipCombatItem}
          onHeroAttack={controller.heroAttack}
          onSummonedAllyAttack={controller.summonedAllyAttack}
          onResolveSavingThrow={controller.resolveCombatSavingThrow}
          onInputChange={setCombatRollInput}
          onResetDie={() => {
            setCombatRollInput('');
            setIsDieRolling(false);
            setDiceError(false);
          }}
          onRoll={(expression, label, selectionMode) => requestDiceRoll(
            expression,
            label,
            'combat',
            selectionMode,
          )}
          onSelectAction={controller.selectCombatAction}
          onUseAction={controller.useCombatAction}
          resourceUses={state.resourceUses}
          suggestedEnemyTargetId={controller.getNpcDecision(
            combat.initiativeOrder[combat.turnIndex] ?? '',
          )?.suggestion.targetIds[0]}
          victoryWordmark="assets/concepts/campaigns/penisuela/ui/victory-wordmark.png"
        />

        <aside className={styles.phasePanel} aria-label={`Фаза ${phase.number}: ${phase.name}`}>
          <span>Контур {phase.number} из {penisuelaFinalBoss.phases.length}</span>
          <strong>{phase.name}</strong>
          <progress max={phase.hpFrom} value={boss?.hp ?? phase.hpFrom} />
          <small>{boss?.hp ?? phase.hpFrom} HP · порог {phase.hpTo}</small>
        </aside>

        {activeHero && (boss?.hp ?? 0) > 0 && !combat.pendingAttack && !allHeroesDown ? (
          <div className={styles.heroConsole} aria-label="Дополнительные действия против контура">
            <span>Ход: {activeHero.name}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedStat('intelligence');
                setConsoleMode('channel');
                setRollInput('');
              }}
            >
              Разорвать активный канал
            </button>
            <button type="button" onClick={openPlanConsole}>Сменить план</button>
          </div>
        ) : null}

        {activeEnemy && (boss?.hp ?? 0) > 0 && !combat.pendingAttack && !allHeroesDown ? (
          <section className={styles.enemyConsole} aria-label="Ход Последнего дубля">
            <span>{combat.weaknessExposed ? 'Канал уже разорван' : `Атака контура ${phase.number}`}</span>
            <h2>{phase.attack.name}</h2>
            <p>{phase.number === 3 && !state.flags['final-boss-dragonfire-charged']
              ? 'Огненная линия сначала заряжается целый раунд и заранее показывает безопасный манёвр.'
              : combat.weaknessExposed
                ? 'Следующая атака отменяется: зафиксируйте разрыв канала.'
                : phase.attack.savingThrow
                  ? 'После зарядки мастер отдельно фиксирует общий урон и d20 каждого живого героя.'
                  : `Нужно ${requiredTargets} ${requiredTargets === 1 ? 'цель' : 'разные цели'}. Каждый d20 и бросок урона будет показан до применения.`}</p>
            {!combat.weaknessExposed && !phase.attack.savingThrow ? (
              <div className={styles.targetSelectors}>
                {Array.from({length: requiredTargets}, (_, index) => (
                  <label key={index}>
                    <span>Цель {index + 1}</span>
                    <select
                      value={resolvedTargetIds[index] ?? ''}
                      onChange={(event) => setTargetIds((current) => {
                        const next = [...resolvedTargetIds];
                        next[index] = event.target.value;
                        return next;
                      })}
                    >
                      {availableTargets.map((hero) => (
                        <option key={hero.id} value={hero.id}>{hero.name} · {state.heroHp[hero.id]} HP</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
            {(state.itemCharges['red-button-18-plus'] ?? 0) > 0
              || (state.flags['dance-troupe-allies'] && !state.flags['dance-troupe-final-assist-used']) ? (
                <div className={styles.resourceActions} aria-label="Одноразовые реакции команды">
                  {(state.itemCharges['red-button-18-plus'] ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        controller.cancelFinalBossReactionWithRedButton();
                        setTargetIds([]);
                      }}
                    >
                      Красная кнопка 18+ · отменить реакцию
                    </button>
                  ) : null}
                  {state.flags['dance-troupe-allies'] && !state.flags['dance-troupe-final-assist-used'] ? (
                    <button
                      type="button"
                      onClick={() => {
                        controller.useDanceTroupeFinalBossAssist();
                        setTargetIds([]);
                      }}
                    >
                      Труппа · увести прожекторы
                    </button>
                  ) : null}
                </div>
              ) : null}
            <button
              type="button"
              onClick={() => {
                if (
                  bossConditionResolution.blocked
                  || combat.weaknessExposed
                  || (phase.attack.savingThrow && !state.flags['final-boss-dragonfire-charged'])
                ) {
                  controller.resolveFinalBossEnemyTurn(resolvedTargetIds);
                  setTargetIds([]);
                  return;
                }
                setExplicitRollInputs({});
                setConsoleMode('enemy');
              }}
            >
              {combat.weaknessExposed
                ? 'Отменить залп разрывом канала'
                : bossConditionResolution.blocked
                  ? 'Потратить навязанную роль модуля'
                : phase.number === 3 && !state.flags['final-boss-dragonfire-charged']
                  ? 'Показать огненную линию'
                  : 'Подготовить явные броски модуля'}
            </button>
          </section>
        ) : null}

        {allHeroesDown ? (
          <section className={styles.fallbackConsole} role="alert">
            <span>Fail-forward · смертей нет</span>
            <h2>{penisuelaFinalBoss.defeatFallback.label}</h2>
            <p>{penisuelaFinalBoss.defeatFallback.resolution}</p>
            <button type="button" onClick={controller.resolveFinalBossDefeatFallback}>
              Зафиксировать аварийное отключение
            </button>
          </section>
        ) : null}

        {consoleMode ? (
          <div className={styles.consoleBackdrop} role="presentation">
            <section className={styles.checkConsole} role="dialog" aria-modal="true" aria-label="Консоль финального плана">
              <div className={styles.consoleHeading}>
                <div>
                  <span>{consoleMode === 'enemy'
                    ? `Контур ${phase.number} · явные броски`
                    : consoleMode === 'channel' ? 'Универсальный манёвр · DC 12' : 'План текущей фазы'}</span>
                  <h2>{consoleMode === 'enemy'
                    ? phase.attack.name
                    : consoleMode === 'channel' ? 'Разорвать активный канал' : selectedPlan.label}</h2>
                </div>
                <button type="button" onClick={closeConsole} aria-label="Закрыть консоль">×</button>
              </div>

              {consoleMode === 'enemy' ? (
                <>
                  <p className={styles.planDescription}>
                    Цифровая и физическая ветки передают в один production resolver те же исходные числа. Ничего не применяется, пока все обязательные d20 и кубики урона не показаны мастеру.
                  </p>
                  {phase.attack.savingThrow ? (
                    <div className={styles.explicitRollGrid}>
                      <div className={styles.explicitRollRow}>
                        <label>
                          <span>Общий урон · {rawDamageExpression(phase.attack.damage)}</span>
                          <input
                            aria-label="Физический бросок общего урона драконьего пламени без модификатора"
                            max={getFinalBossDamageRange(phase.attack.damage)?.max}
                            min={getFinalBossDamageRange(phase.attack.damage)?.min}
                            type="number"
                            value={explicitRollInputs['dragonfire-damage'] ?? ''}
                            onChange={(event) => setExplicitRollInputs((current) => ({...current, 'dragonfire-damage': event.target.value}))}
                          />
                        </label>
                        <button
                          disabled={isDieRolling || !isDiceReady}
                          type="button"
                          onClick={() => requestDiceRoll(
                            rawDamageExpression(phase.attack.damage),
                            'Общий урон драконьего пламени',
                            'dragonfire-damage',
                          )}
                        >
                          Цифровой {rawDamageExpression(phase.attack.damage)}
                        </button>
                        <small>{dragonfireDamage
                          ? `Кубики ${dragonfireDamage.rawDiceTotal} + ${dragonfireDamage.modifier} = ${dragonfireDamage.amount}`
                          : 'Введите сумму кубиков без модификатора.'}</small>
                      </div>
                      {dragonfireSaves.map(({hero, natural}) => {
                        const key = `dragonfire-save:${hero.id}`;
                        const modifier = (hero.stats.dexterity ?? 0)
                          + (state.participantTemporaryModifiers[hero.id] ?? 0);
                        const preview = isFinalBossD20(natural)
                          ? resolveFinalBossSavingThrow(natural, modifier, phase.attack.savingThrow!.dc)
                          : null;
                        return (
                          <div className={styles.explicitRollRow} key={hero.id}>
                            <label>
                              <span>{hero.name} · Ловкость {modifier >= 0 ? '+' : '−'} {Math.abs(modifier)}</span>
                              <input
                                aria-label={`Физический d20 спасброска: ${hero.name}`}
                                max="20"
                                min="1"
                                type="number"
                                value={explicitRollInputs[key] ?? ''}
                                onBlur={() => commitManualRoll(key, explicitRollInputs[key] ?? '')}
                                onChange={(event) => {
                                  markManualRoll(key);
                                  setExplicitRollInputs((current) => ({...current, [key]: event.target.value}));
                                }}
                              />
                            </label>
                            <button
                              disabled={isDieRolling || !isDiceReady}
                              type="button"
                              onClick={() => requestDiceRoll('1d20', `Спасбросок: ${hero.name}`, key)}
                            >
                              Цифровой d20
                            </button>
                            <small>{preview
                              ? `${preview.natural} ${modifier >= 0 ? '+' : '−'} ${Math.abs(modifier)} = ${preview.total} против DC ${preview.dc}: ${preview.success ? 'успех' : 'провал'}`
                              : 'Нужен d20.'}</small>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.explicitRollGrid}>
                      {enemyStrikePreviews.map((preview) => {
                        const attackKey = `enemy-attack:${preview.index}`;
                        const damageKey = `enemy-damage:${preview.index}`;
                        const damageRange = getFinalBossDamageRange(
                          preview.attack.damage,
                          preview.attackResolution?.critical ?? false,
                        );
                        const damageExpression = rawDamageExpression(
                          preview.attack.damage,
                          preview.attackResolution?.critical ?? false,
                        );
                        return (
                          <div className={styles.explicitRollRow} key={`${preview.target?.id}:${preview.index}`}>
                            <label>
                              <span>{preview.attack.name} → {preview.target?.name ?? 'цель'} · AC {preview.target?.ac ?? '—'}</span>
                              <input
                                aria-label={`Физический d20 атаки ${preview.attack.name}`}
                                max="20"
                                min="1"
                                type="number"
                                value={explicitRollInputs[attackKey] ?? ''}
                                onBlur={() => commitManualRoll(attackKey, explicitRollInputs[attackKey] ?? '')}
                                onChange={(event) => {
                                  markManualRoll(attackKey);
                                  setExplicitRollInputs((current) => ({
                                    ...current,
                                    [attackKey]: event.target.value,
                                    [damageKey]: '',
                                  }));
                                }}
                              />
                            </label>
                            <button
                              disabled={isDieRolling || !isDiceReady}
                              type="button"
                              onClick={() => requestDiceRoll('1d20', `${preview.attack.name}: атака`, attackKey)}
                            >
                              Цифровой d20
                            </button>
                            <small>{preview.attackResolution
                              ? `${preview.attackResolution.natural} + ${preview.bonus} = ${preview.attackResolution.total}: ${preview.attackResolution.hit ? preview.attackResolution.critical ? 'критическое попадание' : 'попадание' : 'промах'}`
                              : `Нужен d20 · бонус ${preview.bonus >= 0 ? '+' : '−'} ${Math.abs(preview.bonus)}.`}</small>
                            {preview.attackResolution?.hit ? (
                              <>
                                <label>
                                  <span>Урон · {damageExpression} без модификатора</span>
                                  <input
                                    aria-label={`Физический урон ${preview.attack.name} без модификатора`}
                                    max={damageRange?.max}
                                    min={damageRange?.min}
                                    type="number"
                                    value={explicitRollInputs[damageKey] ?? ''}
                                    onChange={(event) => setExplicitRollInputs((current) => ({...current, [damageKey]: event.target.value}))}
                                  />
                                </label>
                                <button
                                  disabled={isDieRolling || !isDiceReady}
                                  type="button"
                                  onClick={() => requestDiceRoll(damageExpression, `${preview.attack.name}: урон`, damageKey)}
                                >
                                  Цифровой {damageExpression}
                                </button>
                                <small>{preview.damageResolution
                                  ? `Кубики ${formatDamageCalculation(preview.damageResolution.rawDiceTotal, preview.damageResolution.modifier, preview.damageResolution.critical)} = ${preview.damageResolution.amount}`
                                  : 'Нужна сумма кубиков без модификатора.'}</small>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className={styles.checkActions}>
                    <button
                      disabled={isDieRolling || (phase.attack.savingThrow ? !dragonfireReady : !enemyStrikesReady)}
                      type="button"
                      onClick={resolveEnemyTurn}
                    >
                      Зафиксировать все числа и применить ход
                    </button>
                  </div>
                  {diceError ? <p className={styles.diceError}>3D-кубик недоступен: введите физические результаты вручную.</p> : null}
                </>
              ) : (<>
              {consoleMode === 'plan' ? (
                <div className={styles.planTabs} aria-label="Планы победы">
                  {penisuelaFinalBoss.plans.map((plan) => {
                    const available = isFinalBossPlanAvailable(plan, {flags: state.flags, counters: state.counters});
                    return (
                      <button
                        className={plan.id === selectedPlan.id ? styles.planSelected : undefined}
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setSelectedStat(getPlanHeroStats(plan)[0] ?? 'intelligence');
                          setRollInput('');
                        }}
                      >
                        <strong>{plan.label}</strong>
                        <small>{available ? plan.id === 'physical' ? 'Всегда доступен' : 'Условия выполнены' : 'Условия не выполнены'}</small>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <p className={styles.planDescription}>{consoleMode === 'channel'
                ? penisuelaFinalBoss.encounter.weakness.text
                : selectedPlan.description}</p>
              {activeHeroConditionResolution.blocked ? (
                <p className={styles.dcLine} role="status">
                  «Назначенная роль» заблокирует это формальное действие и снимется без применения введённых бросков или предметов.
                </p>
              ) : null}

              {consoleMode === 'plan' && selectedPlan.id === 'physical' ? (
                <div className={styles.physicalPlan}>
                  <p>Физический план выполняется обычными атаками в боевом интерфейсе. Последний нанесённый урон определит аварийный эпилог.</p>
                  <button type="button" onClick={closeConsole}>Вернуться к атаке</button>
                </div>
              ) : (
                <>
                  <div className={styles.checkSelectors}>
                    <label>
                      <span>Характеристика</span>
                      <select value={selectedStat} onChange={(event) => setSelectedStat(event.target.value as HeroStat)}>
                        {(consoleMode === 'channel'
                          ? penisuelaFinalBoss.encounter.weakness.stats.filter(isHeroStat)
                          : getPlanHeroStats(selectedPlan)).map((stat) => (
                            <option key={stat} value={stat}>{statLabels[stat]}</option>
                          ))}
                      </select>
                    </label>
                    <label>
                      <span>Результат d20</span>
                      <input
                        max="20"
                        min="1"
                        type="number"
                        value={rollInput}
                        onBlur={() => commitManualRoll('main', rollInput)}
                        onChange={(event) => {
                          markManualRoll('main');
                          setRollInput(event.target.value);
                        }}
                      />
                    </label>
                  </div>
                  <p className={styles.dcLine}>
                    {activeHero?.name ?? 'Герой'} · модификатор {planModifier >= 0 ? '+' : '−'} {Math.abs(planModifier)} · {consoleMode === 'channel' ? 'DC 12' : `DC ${selectedPlanDc ?? '—'}`}
                  </p>
                  {consoleMode === 'channel' && channelRerollRequired ? (
                    <div className={styles.explicitRollGrid}>
                      <div className={styles.explicitRollRow}>
                        <label>
                          <span>Повтор Егорика и Настасьи · d20</span>
                          <input
                            aria-label="Физический повтор d20 Егорика и Настасьи"
                            max="20"
                            min="1"
                            type="number"
                            value={explicitRollInputs['channel-reroll'] ?? ''}
                            onBlur={() => commitManualRoll(
                              'channel-reroll',
                              explicitRollInputs['channel-reroll'] ?? '',
                            )}
                            onChange={(event) => {
                              markManualRoll('channel-reroll');
                              setExplicitRollInputs((current) => ({
                                ...current,
                                'channel-reroll': event.target.value,
                              }));
                            }}
                          />
                        </label>
                        <button
                          disabled={isDieRolling || !isDiceReady}
                          type="button"
                          onClick={() => requestDiceRoll('1d20', 'Повтор Егорика и Настасьи', 'channel-reroll')}
                        >
                          Цифровой d20
                        </button>
                        <small>{channelRerollPreview
                          ? `${channelRerollPreview.natural} ${planModifier >= 0 ? '+' : '−'} ${Math.abs(planModifier)} = ${channelRerollPreview.total}: ${channelRerollPreview.success ? 'успех' : 'провал'}`
                          : 'Повтор обязателен: автоматического скрытого d20 больше нет.'}</small>
                      </div>
                    </div>
                  ) : null}
                  {consoleMode === 'plan'
                    && planPreview
                    && !planPreview.success
                    && !bossConditionResolution.blocked ? (
                    <div className={styles.explicitRollGrid}>
                      <div className={styles.explicitRollRow}>
                        <label>
                          <span>Обратный импульс → {activeHero?.name} · AC {activeHero?.ac}</span>
                          <input
                            aria-label="Физический d20 обратного импульса"
                            max="20"
                            min="1"
                            type="number"
                            value={explicitRollInputs['plan-reaction-attack'] ?? ''}
                            onBlur={() => commitManualRoll(
                              'plan-reaction-attack',
                              explicitRollInputs['plan-reaction-attack'] ?? '',
                            )}
                            onChange={(event) => {
                              markManualRoll('plan-reaction-attack');
                              setExplicitRollInputs((current) => ({
                                ...current,
                                'plan-reaction-attack': event.target.value,
                                'plan-reaction-damage': '',
                              }));
                            }}
                          />
                        </label>
                        <button
                          disabled={isDieRolling || !isDiceReady}
                          type="button"
                          onClick={() => requestDiceRoll('1d20', 'Обратный импульс: атака', 'plan-reaction-attack')}
                        >
                          Цифровой d20
                        </button>
                        <small>{reactionPreview
                          ? `${reactionPreview.natural} + ${reactionPreview.bonus} = ${reactionPreview.total}: ${reactionPreview.hit ? reactionPreview.critical ? 'критическое попадание' : 'попадание' : 'промах'}`
                          : `Нужен отдельный d20 · бонус ${reactionBonus >= 0 ? '+' : '−'} ${Math.abs(reactionBonus)}.`}</small>
                        {reactionPreview?.hit ? (
                          <>
                            <label>
                              <span>Урон импульса · {rawDamageExpression('1d6+3', reactionPreview.critical)} без модификатора</span>
                              <input
                                aria-label="Физический урон обратного импульса без модификатора"
                                max={getFinalBossDamageRange('1d6+3', reactionPreview.critical)?.max}
                                min={getFinalBossDamageRange('1d6+3', reactionPreview.critical)?.min}
                                type="number"
                                value={explicitRollInputs['plan-reaction-damage'] ?? ''}
                                onChange={(event) => setExplicitRollInputs((current) => ({...current, 'plan-reaction-damage': event.target.value}))}
                              />
                            </label>
                            <button
                              disabled={isDieRolling || !isDiceReady}
                              type="button"
                              onClick={() => requestDiceRoll(
                                rawDamageExpression('1d6+3', reactionPreview.critical),
                                'Обратный импульс: урон',
                                'plan-reaction-damage',
                              )}
                            >
                              Цифровой {rawDamageExpression('1d6+3', reactionPreview.critical)}
                            </button>
                            <small>{reactionDamagePreview
                              ? `Кубики ${formatDamageCalculation(reactionDamagePreview.rawDiceTotal, reactionDamagePreview.modifier, reactionDamagePreview.critical)} = ${reactionDamagePreview.amount}`
                              : 'Нужна сумма кубиков без модификатора.'}</small>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {consoleMode === 'plan'
                    && planPreview
                    && !planPreview.success
                    && bossConditionResolution.blocked ? (
                      <p className={styles.dcLine} role="status">
                        Провал плана не требует броска реакции: «назначенная роль» модуля поглотит обратный импульс и снимется.
                      </p>
                    ) : null}
                  <div className={styles.checkActions}>
                    {clearChoiceAvailable ? (
                      <button
                        className={useClearChoiceConfirmation ? styles.clearChoiceActive : undefined}
                        type="button"
                        onClick={() => setUseClearChoiceConfirmation((current) => !current)}
                      >
                        Подтверждение выбора: {useClearChoiceConfirmation ? '+2 включено' : 'добавить +2'}
                      </button>
                    ) : null}
                    <button
                      disabled={isDieRolling}
                      type="button"
                      onClick={() => requestDiceRoll('1d20', consoleMode === 'channel' ? 'Разрыв канала' : selectedPlan.label)}
                    >
                      {isDieRolling ? 'Кубик в полёте…' : isDiceReady ? 'Бросить цифровой d20' : 'Кубик готовится…'}
                    </button>
                    {consoleMode === 'channel' && !state.flags['final-boss-heroic-idea-used'] ? (
                      <button
                        type="button"
                        onClick={() => {
                          controller.acceptFinalBossHeroicIdea(activeHero?.id ?? '');
                          closeConsole();
                        }}
                      >
                        Мастер: принять точную идею без броска
                      </button>
                    ) : null}
                    <button
                      disabled={!activeHeroConditionResolution.blocked && (
                        !isValidD20(rollInput)
                        || (consoleMode === 'channel' ? !channelReady : !selectedPlanAvailable || !planReactionReady)
                      )}
                      type="button"
                      onClick={consoleMode === 'channel' ? resolveChannel : resolvePlan}
                    >
                      Зафиксировать исход
                    </button>
                  </div>
                  {diceError ? <p className={styles.diceError}>3D-кубик недоступен: введите физический результат вручную.</p> : null}
                </>
              )}
              </>)}
            </section>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <CampaignScene
      itemController={controller} inventoryArtwork={controller.inventoryArtwork}
      campaignId={campaignId}
      campaignScenes={campaignScenes}
      gameMasterConsole={(
        <GameMasterConsole
          campaignScenes={campaignScenes}
          controller={controller}
          definition={penisuelaFinalBossGameplay}
          scene={dynamicScene}
        />
      )}
      externalRevealedIds={acquiredInspectableIds}
      externallyManagedIds={controller.managedInspectableIds}
      onMasterSceneRestart={controller.resetSession}
      onMasterStepBack={controller.canUndo ? controller.undoLastCommand : undefined}
      scene={dynamicScene}
      interactiveContent={(
        <>
          {interactiveContent}
          <D20Roller
            diceExpression={diceExpression}
            requestId={dieRollRequestId}
            rollLabel={diceLabel}
            rolling={isDieRolling}
            selectionMode={diceSelection}
            onError={() => {
              setIsDieRolling(false);
              setDiceError(true);
            }}
            onReadyChange={setIsDiceReady}
            onResult={(result) => {
              if (diceResultKey === 'main') setRollInput(String(result));
              else if (diceResultKey === 'combat') setCombatRollInput(String(result));
              else setExplicitRollInputs((current) => ({...current, [diceResultKey]: String(result)}));
              setIsDieRolling(false);
            }}
          />
        </>
      )}
    />
  );
}
