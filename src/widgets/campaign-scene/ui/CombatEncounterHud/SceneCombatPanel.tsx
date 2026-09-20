import {useCallback, useState} from 'react';
import type {GalleryGameplayDefinition} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CombatState} from '../../../../entities/combat/model/types';
import type {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import type {DiceSelectionMode} from '../../../../shared/lib/dice/diceSelection';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {CombatEncounterHud} from './CombatEncounterHud';
import {getCampaignCombatPresentation} from '../../../../entities/campaign-session/model/itemSkins';

interface SceneCombatPanelProps {
  combat: CombatState;
  controller: ReturnType<typeof useGallerySession>;
  definition: GalleryGameplayDefinition;
  heroTokens: Record<string, string>;
  onContinue: () => void;
  onCombatResolved?: () => void;
}

/** Shared session wiring keeps dice state and combat inputs out of story widgets. */
export function SceneCombatPanel({combat, controller, definition, heroTokens, onContinue, onCombatResolved}: SceneCombatPanelProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [requestId, setRequestId] = useState(0);
  const [expression, setExpression] = useState('1d20');
  const [label, setLabel] = useState('Бросок d20');
  const [selection, setSelection] = useState<DiceSelectionMode>('sum');
  const resetDie = useCallback(() => {
    setInput('');
    setError(false);
    setRolling(false);
  }, []);
  const encounter = definition.encounters.find((item) => item.id === combat.encounterId);

  return (
    <>
      <CombatEncounterHud
        combat={combat}
        definition={getCampaignCombatPresentation(definition, controller.state.flags)}
        diceError={error}
        diceReady={ready}
        fallbackEnemyToken={encounter?.units?.[0]?.token ?? ''}
        heroes={controller.sessionHeroes}
        heroHp={controller.state.heroHp}
        participantTemporaryModifiers={controller.state.participantTemporaryModifiers}
        participantConditions={Object.fromEntries(controller.sessionHeroes.map((hero) => [
          hero.id, controller.getParticipantConditions(hero.id),
        ]))}
        inventoryState={controller.state.inventoryState}
        resourceUses={controller.state.resourceUses}
        heroTokens={heroTokens}
        inputValue={input}
        isRolling={rolling}
        onApplyDamage={controller.applyCombatDamage}
        onCancelPendingAttack={controller.cancelPendingCombatAttackWithRedButton}
        onContinue={onContinue}
        onCombatResolved={onCombatResolved}
        onDefeatFallback={controller.resolveCombatDefeatFallback}
        onEnemyAttack={controller.enemyAttack}
        onEquipItem={controller.equipCombatItem}
        onHeroAttack={controller.heroAttack}
        onSummonedAllyAttack={controller.summonedAllyAttack}
        onResolveSavingThrow={controller.resolveCombatSavingThrow}
        onInputChange={(value) => {setInput(value); setError(false);}}
        onResetDie={resetDie}
        onRoll={(dice, title, mode = 'sum') => {
          setInput('');
          setExpression(dice);
          setLabel(title);
          setSelection(mode);
          setError(false);
          setRolling(true);
          setRequestId((current) => current + 1);
        }}
        onSelectAction={controller.selectCombatAction}
        onUseAction={controller.useCombatAction}
        suggestedEnemyTargetId={controller.getNpcDecision(
          combat.initiativeOrder[combat.turnIndex] ?? '',
        )?.suggestion.targetIds[0]}
        timelineEvents={controller.state.events}
      />
      <D20Roller
        diceExpression={expression}
        requestId={requestId}
        rollLabel={label}
        rolling={rolling}
        selectionMode={selection}
        onReadyChange={setReady}
        onError={() => {setRolling(false); setError(true);}}
        onResult={(result) => {setInput(String(result)); setRolling(false);}}
      />
    </>
  );
}
