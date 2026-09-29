import {CampaignPresentationContext} from '../../../../features/navigate-campaign-scene/model/campaignPresentation';
import {CampaignStepHistoryContext} from '../../../../features/navigate-campaign-scene/model/campaignStepHistoryContext';
import {useContext, useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useNavigate} from 'react-router-dom';
import type {GalleryGameplayDefinition} from '../../../../entities/campaign-session/model/galleryGameplay';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import type {GallerySessionController} from '../../../../features/navigate-campaign-scene/model/useGallerySession';
import {useCombatSkillVideosEnabled} from '../../../../features/run-combat/model/combatPresentationSettings';
import {SceneNavigationEditor} from './SceneNavigationEditor';
import {describeGmEvent, getGmLabels, getGmUndoEntry} from '../../model/gmConsolePresentation';
import {CombatSandboxLauncher} from './CombatSandboxLauncher';
import {InitiativeEditor} from './InitiativeEditor';
import {InventoryEditor} from './InventoryEditor';
import {NpcOverrideEditor} from './NpcOverrideEditor';
import {ParticipantEditor} from './ParticipantEditor';
import {SessionJournal} from './SessionJournal';
import {WorldStateEditor} from './WorldStateEditor';
import styles from './GameMasterConsole.module.css';

type ConsoleTab = 'scene' | 'participants' | 'combat' | 'world' | 'inventory' | 'journal';

interface GameMasterConsoleProps {
  campaignScenes: CampaignSessionScene[];
  controller: GallerySessionController;
  definition: GalleryGameplayDefinition;
  mode?: 'session' | 'combat-sandbox';
  scene: CampaignSessionScene;
}

const tabs: Array<{id: ConsoleTab; label: string}> = [
  {id: 'participants', label: 'Герои'},
  {id: 'inventory', label: 'Инвентарь'},
  {id: 'combat', label: 'Бой'},
  {id: 'scene', label: 'Сцены'},
  {id: 'world', label: 'Прогресс'},
  {id: 'journal', label: 'Журнал'},
];

export function GameMasterConsole({
  campaignScenes,
  controller,
  definition,
  mode = 'session',
  scene,
}: GameMasterConsoleProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ConsoleTab>(mode === 'combat-sandbox' ? 'combat' : 'participants');
  const dialogId = useId();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const [skillVideosEnabled, setSkillVideosEnabled] = useCombatSkillVideosEnabled();
  const {state} = controller;
  const doomStage = Math.max(0, Math.min(5, state.counters.doom ?? 0));
  const consoleAcquired = state.inventory.includes('overload-console');
  const showDoomIndicator = mode === 'session'
    && consoleAcquired
    && !state.combat;
  const presentation = useContext(CampaignPresentationContext);
  const stepHistory = useContext(CampaignStepHistoryContext);
  const updateDoom = presentation?.updateDoom;
  const sessionId = state.events[0]?.id ?? state.campaignId;
  useEffect(() => {
    updateDoom?.({stage: doomStage, visible: showDoomIndicator, consoleAcquired, sessionId});
  }, [doomStage, showDoomIndicator, consoleAcquired, sessionId, updateDoom]);
  const visibleTabs = mode === 'combat-sandbox'
    ? tabs.filter((tab) => ['participants', 'combat', 'journal'].includes(tab.id))
    : tabs;


  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleModalKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        window.setTimeout(() => triggerRef.current?.focus());
        return;
      }
      if (event.key !== 'Tab') return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = [...drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        drawer.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!drawer.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleModalKeyboard, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleModalKeyboard, true);
    };
  }, [open]);

  const closeConsole = () => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus());
  };

  const labels = getGmLabels(campaignScenes, state, definition);
  const undoEntry = getGmUndoEntry(state.events);
  const undoLabel = describeGmEvent(undoEntry, labels);
  const undo = () => {
    if (!undoEntry) return;
    if (undoEntry.type === 'scene-navigated' && stepHistory) {
      closeConsole();
      stepHistory.stepBack();
      return;
    }
    controller.undoLastCommand();
    const previousSceneId = undoEntry.type === 'manual-adjustment' && undoEntry.adjustment.kind === 'scene'
      ? undoEntry.adjustment.previousSceneId : undefined;
    if (previousSceneId && campaignScenes.some(item => item.id === previousSceneId)) {
      closeConsole();
      const search = undoEntry.type === 'manual-adjustment' && undoEntry.adjustment.kind === 'scene' ? undoEntry.adjustment.previousSceneSearch ?? '' : '';
      navigate(`/campaign/${state.campaignId}/play/${previousSceneId}${search}`);
    }
  };

  return createPortal((
    <div className={styles.consoleRoot}>


      <button
        aria-controls={dialogId}
        aria-expanded={open}
        aria-label="Открыть полную консоль мастера"
        className={styles.consoleTrigger}
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">⚙</span>
        <span>GM</span>
      </button>

      {open ? (
        <div className={styles.backdrop} onPointerDown={closeConsole}>
          <aside
            aria-labelledby={titleId}
            aria-modal="true"
            className={styles.drawer}
            id={dialogId}
            ref={drawerRef}
            role="dialog"
            tabIndex={-1}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <header className={styles.header}>
              <div>
                <p>Управление текущим прохождением</p>
                <h2 id={titleId}>{mode === 'combat-sandbox' ? 'Боевая песочница' : 'Консоль мастера'}</h2>
                <span>{scene.title}</span>
              </div>
              <button ref={closeRef} type="button" onClick={closeConsole} aria-label="Закрыть консоль мастера">×</button>
            </header>

            <nav
              className={`${styles.tabs} ${mode === 'combat-sandbox' ? styles.compactTabs : ''}`}
              aria-label="Разделы консоли мастера"
              role="tablist"
            >
              {visibleTabs.map((tab) => (
                <button
                  aria-selected={activeTab === tab.id}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const current = visibleTabs.findIndex(item => item.id === tab.id);
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? visibleTabs.length - 1
                      : (current + (event.key === 'ArrowRight' ? 1 : -1) + visibleTabs.length) % visibleTabs.length;
                    setActiveTab(visibleTabs[next].id);
                    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                    buttons?.[next]?.focus();
                  }}
                  aria-controls={`${dialogId}-panel`}
                  id={`${dialogId}-tab-${tab.id}`}
                  className={activeTab === tab.id ? styles.activeTab : undefined}
                  key={tab.id}
                  role="tab"
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className={styles.panel} role="tabpanel" id={`${dialogId}-panel`} aria-labelledby={`${dialogId}-tab-${activeTab}`}>
              {activeTab === 'scene' ? <SceneNavigationEditor scene={scene} scenes={campaignScenes} controller={controller} onClose={closeConsole} /> : null}
              {activeTab === 'inventory' ? <InventoryEditor campaignScenes={campaignScenes} controller={controller} definition={definition} /> : null}

              {activeTab === 'participants' ? (
                <ParticipantEditor controller={controller} definition={definition} />
              ) : null}

              {activeTab === 'combat' ? (
                <div className={styles.sectionStack}>
                  <section className={styles.section} aria-label="Настройки показа боя">
                    <label className={styles.confirmationControl}>
                      <input
                        checked={!skillVideosEnabled}
                        type="checkbox"
                        onChange={(event) => setSkillVideosEnabled(!event.target.checked)}
                      />
                      <span>
                        <strong>Отключить видео навыков</strong>
                        <small>Навыки сработают сразу, без видеовставок. Настройка сохраняется для следующих запусков.</small>
                      </span>
                    </label>
                  </section>
                  {state.combat ? <>
                    <InitiativeEditor controller={controller} />
                    <details className={styles.disclosure}><summary>Изменить решение противника</summary><NpcOverrideEditor controller={controller} /></details>
                  </> : <p className={styles.emptyState}>Сейчас боя нет. Во время боя здесь можно исправить порядок ходов и действия противников.</p>}
                  {mode === 'session' ? <CombatSandboxLauncher /> : null}
                </div>
              ) : null}

              {activeTab === 'world' ? (
                <div className={styles.sectionStack}>
                  <WorldStateEditor controller={controller} definition={definition} campaignScenes={campaignScenes} />
                </div>
              ) : null}

              {activeTab === 'journal' ? <SessionJournal controller={controller} labels={labels} /> : null}
            </div>

            <footer className={styles.footer}>
              <span className={styles.undoSummary}>Отменится: {undoLabel}</span>
              <button disabled={!controller.canUndo} type="button" onClick={undo}>
                Отменить последнее действие
              </button>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  ), document.body);
}
