import type {CombatActionView, CombatArenaViewInput, CombatArenaViewModel, CombatTargetView, CombatantView} from '../../../entities/combat/model/view';

export function createCombatArenaView(input: CombatArenaViewInput): CombatArenaViewModel | null {
  const {
    actions,
    combat,
    encounter,
    fallbackEnemyToken,
    heroes,
    heroHp,
    heroPortraits = {},
    heroTokens,
    requestedEnemyTargetId,
    requestedHeroTargetId,
  } = input;
  const activeCombatantId = combat.initiativeOrder[combat.turnIndex];
  const activeHero = heroes.find((hero) => hero.id === activeCombatantId);
  const activeEnemy = combat.enemies[activeCombatantId];
  if (!activeHero && !activeEnemy) return null;

  const party: CombatTargetView[] = heroes.map((hero) => ({
    id: hero.id,
    name: hero.name,
    faction: 'hero',
    token: heroTokens[hero.id] ?? fallbackEnemyToken,
    ...heroPortraits[hero.id],
    hp: heroHp[hero.id] ?? 0,
    maxHp: hero.maxHp,
    ac: hero.ac,
  }));
  const enemyTargets: CombatTargetView[] = Object.values(combat.enemies).map((enemy) => ({
    id: enemy.id,
    name: enemy.name,
    faction: 'enemy',
    token: enemy.token ?? fallbackEnemyToken,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    ac: enemy.ac,
  }));

  const participantById = new Map<string, CombatantView>();
  heroes.forEach((hero) => {
    const attack = encounter.heroAttacks.find((item) => item.characterId === hero.id);
    participantById.set(hero.id, {
      ...party.find((target) => target.id === hero.id)!,
      attackName: attack?.name ?? 'Атака',
      attackBonus: attack?.bonus ?? 0,
    });
  });
  Object.values(combat.enemies).forEach((enemy) => participantById.set(enemy.id, {
    id: enemy.id,
    name: enemy.name,
    faction: 'enemy',
    token: enemy.token ?? fallbackEnemyToken,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    ac: enemy.ac,
    attackName: enemy.attack.name,
    attackBonus: enemy.attack.bonus,
  }));
  const active = participantById.get(activeCombatantId);
  if (!active) return null;

  const heroTargetCandidates = activeHero ? party : party.filter((hero) => hero.hp > 0);
  const suggestedHero = [...heroTargetCandidates]
    .sort((a, b) => activeHero
      ? (b.maxHp - b.hp) - (a.maxHp - a.hp) || a.hp - b.hp || a.id.localeCompare(b.id)
      : a.hp - b.hp || a.id.localeCompare(b.id))[0];
  const selectedHeroTargetId = heroTargetCandidates.some((hero) => (
    hero.id === requestedHeroTargetId
    && (!activeHero || hero.hp < hero.maxHp || heroTargetCandidates.every((candidate) => candidate.hp >= candidate.maxHp))
  ))
    ? requestedHeroTargetId
    : suggestedHero?.id ?? '';

  const baseTargets = activeHero ? enemyTargets : party;
  const selectedTargetId = combat.pendingAttack?.targetId
    ?? (activeHero ? requestedEnemyTargetId : selectedHeroTargetId);
  const selectedTarget = baseTargets.find((target) => target.id === selectedTargetId);
  const selectedCombatActions = activeHero
    ? actions.filter((action) => combat.selectedActionIds.includes(action.id))
    : [];
  const selectedActionExposesWeakness = selectedCombatActions.some((action) => (
    action.effects.some((effect) => effect.type === 'expose-weakness')
  ));
  const targets = selectedTarget
    ? baseTargets.map((target) => target.id === selectedTarget.id
      ? {
          ...target,
          ac: combat.pendingAttack?.targetId === target.id
            ? combat.pendingAttack.targetAc
            : selectedActionExposesWeakness
              ? encounter.weakness.reducedAc
              : target.ac,
        }
      : target)
    : baseTargets;

  const actionViews: CombatActionView[] = activeHero
    ? actions
      .filter((action) => action.characterId === activeHero.id && action.encounterIds.includes(combat.encounterId))
      .map((action) => {
        const uses = combat.actionUses[action.id] ?? 0;
        const weaknessEffect = action.effects.some((effect) => effect.type === 'expose-weakness');
        const healingEffect = action.effects.find((effect) => effect.type === 'healing');
        const healingTarget = action.target === 'self'
          ? party.find((hero) => hero.id === activeHero.id)
          : party.find((hero) => hero.id === selectedHeroTargetId);
        const healingTargetFull = Boolean(healingEffect && healingTarget && healingTarget.hp >= healingTarget.maxHp);
        return {
          id: action.id,
          source: action.source,
          name: action.name,
          description: action.description,
          effectLabel: weaknessEffect
            ? (selectedTarget?.ac ?? encounter.ac) <= encounter.weakness.reducedAc
              ? `Слабость раскрыта: AC цели ${encounter.weakness.reducedAc}`
              : `Следующая атака: AC цели ${selectedTarget?.ac ?? encounter.ac} → ${encounter.weakness.reducedAc}`
            : healingEffect
              ? `Лечение: ${healingEffect.dice} HP. Атаку не усиливает.`
              : 'Особый эффек предмета.',
          attackModifier: weaknessEffect,
          rollExpression: healingEffect?.dice,
          target: action.target,
          uses,
          maxUses: action.uses.max,
          disabled: uses >= action.uses.max || healingTargetFull,
          disabledReason: uses >= action.uses.max
            ? 'Использован'
            : healingTargetFull ? 'HP уже полны' : undefined,
        };
      })
    : [];
  const selectedActionViews = actionViews.filter((action) => combat.selectedActionIds.includes(action.id));
  const utilityAction = selectedActionViews.find((action) => action.source === 'item' && !action.attackModifier);
  const attackEnhancements = [
    ...(activeHero && combat.weaknessExposed
      ? [`Слабость раскрыта: AC цели ${encounter.weakness.reducedAc}`]
      : []),
    ...selectedActionViews
      .filter((action) => action.attackModifier)
      .map((action) => (
        `${action.source === 'ability' ? 'Навык' : 'Предмет'} · ${action.name} · ${action.effectLabel.replace(/^Следующая атака: /u, '')}`
      )),
  ].filter((enhancement, index, all) => all.indexOf(enhancement) === index);

  return {
    encounter,
    active,
    activeHero,
    actions: actionViews,
    attackEnhancements,
    equippedItemId: activeHero ? combat.equippedItems[activeHero.id] ?? '' : '',
    enemyTargets,
    party,
    participants: combat.initiativeOrder
      .map((id) => participantById.get(id))
      .filter((participant): participant is CombatantView => Boolean(participant)),
    selectedHeroTargetId,
    selectedTarget: targets.find((target) => target.id === selectedTargetId),
    selectedTargetId,
    supportTargets: utilityAction?.target === 'ally' ? party : [],
    targets,
    utilityAction,
    victory: enemyTargets.every((enemy) => enemy.hp <= 0),
  };
}
