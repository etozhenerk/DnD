import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {
  penisuelaGalleryHeroes,
  penisuelaSessionPreview,
} from '../../../../entities/campaign-session/model/data';
import type {CombatSkillVideoCue} from '../../../../entities/combat/model/skillVideo';
import {useGallerySession} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {useCombatSkillVideosEnabled} from '../../../../features/run-combat/model/combatPresentationSettings';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {DiceSelectionMode} from '../../../../shared/lib/dice/diceSelection';
import {D20Roller} from '../../../../shared/ui/D20Roller/D20Roller';
import {CombatEncounterHud} from '../../../campaign-scene/ui/CombatEncounterHud/CombatEncounterHud';
import {CombatSkillVideoOverlay} from '../../../campaign-scene/ui/CombatSkillVideoOverlay/CombatSkillVideoOverlay';
import {GameMasterConsole} from '../../../campaign-scene/ui/GameMasterConsole/GameMasterConsole';
import {
  COMBAT_SANDBOX_ENCOUNTER_ID,
  COMBAT_SANDBOX_SCENE_ID,
  combatSandboxDefinition,
  combatSandboxScene,
} from '../../model/combatSandboxFixture';
import styles from './CombatSandbox.module.css';
import {CombatEffectsPreview} from '../CombatEffectsPreview/CombatEffectsPreview';

const heroTokens = Object.fromEntries(
  penisuelaSessionPreview.party.map((member) => [member.characterId, member.token]),
);

const videoPreviewCue: CombatSkillVideoCue = {
  id: 'linda-pitahaya-summon-preview',
  title: 'Призыв питахайиноидов',
  posterSrc: resolveAsset('assets/concepts/campaigns/penisuela/skill-videos/linda-pitahaya-summon-poster.png'),
  videoSrc: resolveAsset('assets/concepts/campaigns/penisuela/skill-videos/linda-pitahaya-summon.mp4'),
};
const videoPreviewCues = [videoPreviewCue];

export function CombatSandbox() {
  const legacySceneIds = useMemo(() => [COMBAT_SANDBOX_SCENE_ID], []);
  const controller = useGallerySession(
    combatSandboxDefinition,
    penisuelaGalleryHeroes,
    legacySceneIds,
  );
  const {state} = controller;
  const [encounterId, setEncounterId] = useState(state.combat?.encounterId ?? COMBAT_SANDBOX_ENCOUNTER_ID);
  const startRequestedRef = useRef(false);
  const bubsildaTurnPreparedRef = useRef(false);
  const [physicalRoll, setPhysicalRoll] = useState('');
  const [isDieRolling, setIsDieRolling] = useState(false);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const [dieRollRequestId, setDieRollRequestId] = useState(0);
  const [diceError, setDiceError] = useState(false);
  const [activeDiceExpression, setActiveDiceExpression] = useState('1d20');
  const [activeDiceLabel, setActiveDiceLabel] = useState('Бросок d20');
  const [activeDiceSelection, setActiveDiceSelection] = useState<DiceSelectionMode>('sum');
  const [videoCue, setVideoCue] = useState<CombatSkillVideoCue | null>(null);
  const [skillVideosEnabled] = useCombatSkillVideosEnabled();
  const activeCombatantId = state.combat?.initiativeOrder[state.combat.turnIndex];

  useEffect(() => {
    if (state.combat) {
      startRequestedRef.current = false;
      return;
    }
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;
    controller.startCombat(encounterId);
  }, [controller, state.combat, encounterId]);

  useEffect(() => {
    const combat = state.combat;
    if (!combat) {
      bubsildaTurnPreparedRef.current = false;
      return;
    }
    if (
      bubsildaTurnPreparedRef.current
      || combat.round !== 1
      || combat.log.length !== 1
      || combat.pendingAttack
    ) return;
    bubsildaTurnPreparedRef.current = true;
    const order = ['bubsilda', ...combat.initiativeOrder.filter((id) => id !== 'bubsilda')];
    controller.manualSetInitiative(order, 'bubsilda', 1);
  }, [controller, state.combat]);

  const resetDie = useCallback(() => {
    setIsDieRolling(false);
    setPhysicalRoll('');
    setDiceError(false);
    setActiveDiceSelection('sum');
  }, []);

  useEffect(() => resetDie(), [activeCombatantId, resetDie]);

  useEffect(() => {
    if (!skillVideosEnabled) setVideoCue(null);
  }, [skillVideosEnabled]);

  const startDiceRoll = (
    diceExpression = '1d20',
    diceLabel = 'Бросок d20',
    selectionMode: DiceSelectionMode = 'sum',
  ) => {
    if (isDieRolling || !isDiceReady) return;
    setPhysicalRoll('');
    setActiveDiceExpression(diceExpression);
    setActiveDiceLabel(diceLabel);
    setActiveDiceSelection(selectionMode);
    setDiceError(false);
    setIsDieRolling(true);
    setDieRollRequestId((value) => value + 1);
  };

  const restartSandbox = useCallback(() => {
    resetDie();
    setVideoCue(null);
    controller.resetSession();
  }, [controller, resetDie]);

  return (
    <section className={styles.sandbox} aria-label="Боевая песочница Пенисуэлы">
      <div className={styles.stage} aria-hidden="true">
        <img src={resolveAsset(combatSandboxScene.background)} alt="" />
        <div />
      </div>

      <div className={styles.sandboxControls}>
        <select aria-label="Тестовая встреча" value={encounterId} onChange={(event) => {
          setEncounterId(event.target.value);
          restartSandbox();
        }}>
          {combatSandboxDefinition.encounters.map((encounter) => <option key={encounter.id} value={encounter.id}>{encounter.name}</option>)}
        </select>
        <button
          disabled={!skillVideosEnabled}
          type="button"
          onClick={() => setVideoCue(videoPreviewCue)}
        >
          Тест видеослота
        </button>
        <button type="button" onClick={restartSandbox}>Перезапустить бой</button>
        <CombatEffectsPreview token={heroTokens.bubsilda} />
        <Link to="/campaign/penisuela/play/pussy-prop-room">Вернуться в кампанию</Link>
      </div>

      <GameMasterConsole
        campaignScenes={[combatSandboxScene]}
        controller={controller}
        definition={combatSandboxDefinition}
        mode="combat-sandbox"
        scene={{...combatSandboxScene, title: combatSandboxDefinition.encounters.find(encounter => encounter.id === encounterId)?.name ?? combatSandboxScene.title}}
      />

      {state.combat ? (
        <CombatEncounterHud
          combat={state.combat}
          definition={combatSandboxDefinition}
          diceError={diceError}
          diceReady={isDiceReady}
          fallbackEnemyToken={combatSandboxScene.background}
          heroes={controller.sessionHeroes}
          heroHp={state.heroHp}
          participantTemporaryModifiers={state.participantTemporaryModifiers}
          participantConditions={Object.fromEntries(controller.sessionHeroes.map((hero) => [
            hero.id,
            controller.getParticipantConditions(hero.id),
          ]))}
          timelineEvents={state.events}
          heroTokens={heroTokens}
          inputValue={physicalRoll}
          inventoryState={state.inventoryState}
          isRolling={isDieRolling}
          onApplyDamage={controller.applyCombatDamage}
          onContinue={restartSandbox}
          onDefeatFallback={controller.resolveCombatDefeatFallback}
          onEnemyAttack={controller.enemyAttack}
          onEquipItem={controller.equipCombatItem}
          onHeroAttack={controller.heroAttack}
          onSummonedAllyAttack={controller.summonedAllyAttack}
          onResolveSavingThrow={controller.resolveCombatSavingThrow}
          onInputChange={(value) => {
            setPhysicalRoll(value);
            setDiceError(false);
          }}
          onResetDie={resetDie}
          onRoll={startDiceRoll}
          onSelectAction={controller.selectCombatAction}
          onUseAction={controller.useCombatAction}
          resourceUses={state.resourceUses}
          suggestedEnemyTargetId={controller.getNpcDecision(activeCombatantId ?? '')?.suggestion.targetIds[0]}
          victoryWordmark={resolveAsset('assets/concepts/campaigns/penisuela/ui/victory-wordmark.png')}
        />
      ) : (
        <p className={styles.loading} role="status">Подготавливаем тестовую инициативу…</p>
      )}

      <D20Roller
        diceExpression={activeDiceExpression}
        requestId={dieRollRequestId}
        rollLabel={activeDiceLabel}
        rolling={isDieRolling}
        selectionMode={activeDiceSelection}
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

      <CombatSkillVideoOverlay
        cue={skillVideosEnabled ? videoCue : null}
        preloadCues={skillVideosEnabled ? videoPreviewCues : []}
        onComplete={() => setVideoCue(null)}
      />
    </section>
  );
}
