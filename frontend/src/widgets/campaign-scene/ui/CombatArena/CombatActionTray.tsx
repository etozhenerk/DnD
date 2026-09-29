import {useEffect, useState, type CSSProperties} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatActionView} from './combatTypes';
import styles from './CombatActionTray.module.css';
import {ArtworkFocus} from '../../../../shared/ui/ArtworkFocus/ArtworkFocus';

interface CombatActionTrayProps {
  actions: CombatActionView[];
  activeId: string;
  onClearPreview: () => void;
  onBasicAttack: () => void;
  onEquipItem: (actionId: string | null) => void;
  onSelectAction: (actionId: string) => void;
  previewActionId: string | null;
  selectedActionIds: string[];
}

const abilityIcon = 'assets/concepts/ui/hero-book-icon-attack.png';
const itemIcon = 'assets/concepts/ui/hero-book-icon-hp.png';
const actionOrbFrame = 'assets/concepts/campaigns/penisuela/ui/floating-hud/action-orb-frame.png';
const abilityGlyphs: Record<string, string> = {
  'linda-will-to-live': '♥',
  'linda-flight': '↟',
  'linda-tiny-size': '↕',
  'linda-magic-whisper-guards': '✦',
  'linda-pitahaya-summon': '✿',
  'linda-resort-turbulence': '◎',
};
const abilityIcons: Record<string, string> = {
  'netak-retake': 'assets/concepts/campaigns/penisuela/ui/skill-icons/netak/netak-retake.png',
  'netak-fired': 'assets/concepts/campaigns/penisuela/ui/skill-icons/netak/netak-fired.png',
  'netak-main-character': 'assets/concepts/campaigns/penisuela/ui/skill-icons/netak/netak-main-character.png',
  'netak-assistants': 'assets/concepts/campaigns/penisuela/ui/skill-icons/netak/netak-assistants.png',
  'netak-mirrors': 'assets/concepts/campaigns/penisuela/ui/skill-icons/netak/netak-mirrors.png',
  'netak-toxic': 'assets/concepts/campaigns/penisuela/ui/skill-icons/netak/netak-toxic.png',

  'angel-fat-trap': 'assets/concepts/campaigns/penisuela/ui/skill-icons/guests/angel-fat-trap.png',
  'grey-wiese-high-note': 'assets/concepts/campaigns/penisuela/ui/skill-icons/guests/grey-wiese-high-note.png',
  'kreed-chat-clip-it': 'assets/concepts/campaigns/penisuela/ui/skill-icons/guests/kreed-syuda-blin.png',
  'bubsilda-northern-resilience': 'assets/concepts/campaigns/penisuela/ui/skill-icons/bubsilda/northern-resilience.png',
  'bubsilda-bubis-balance': 'assets/concepts/campaigns/penisuela/ui/skill-icons/bubsilda/bubis-balance.png',
  'bubsilda-royal-will': 'assets/concepts/campaigns/penisuela/ui/skill-icons/bubsilda/royal-will.png',
  'bubsilda-ice-guard': 'assets/concepts/campaigns/penisuela/ui/skill-icons/bubsilda/ice-guard.png',
  'bubsilda-documentary-guards': 'assets/concepts/campaigns/penisuela/ui/skill-icons/bubsilda/documentary.png',
  'bubsilda-grandaxin': 'assets/concepts/campaigns/penisuela/ui/skill-icons/bubsilda/grandaxin.png',
  'bubsilda-emergency-landing': 'assets/concepts/campaigns/penisuela/ui/skill-icons/bubsilda/emergency-landing.png',
  'linda-will-to-live': 'assets/concepts/campaigns/penisuela/ui/skill-icons/linda/will-to-live.png',
  'linda-flight': 'assets/concepts/campaigns/penisuela/ui/skill-icons/linda/flight.png',
  'linda-tiny-size': 'assets/concepts/campaigns/penisuela/ui/skill-icons/linda/size-change.png',
  'linda-magic-whisper-guards': 'assets/concepts/campaigns/penisuela/ui/skill-icons/linda/magic-whisper.png',
  'linda-pitahaya-summon': 'assets/concepts/campaigns/penisuela/ui/skill-icons/linda/pitahayanoid-summon.png',
  'linda-resort-turbulence': 'assets/concepts/campaigns/penisuela/ui/skill-icons/linda/resort-turbulence.png',
  'lambert-tech-genius': 'assets/concepts/campaigns/penisuela/ui/skill-icons/lambert/tech-genius.png',
  'lambert-double-shot': 'assets/concepts/campaigns/penisuela/ui/skill-icons/lambert/double-shot.png',
  'lambert-sarcasm': 'assets/concepts/campaigns/penisuela/ui/skill-icons/lambert/sarcasm.png',
  'lambert-sacrifice': 'assets/concepts/campaigns/penisuela/ui/skill-icons/lambert/sacrifice.png',
  'lambert-hacker-pulse-guards': 'assets/concepts/campaigns/penisuela/ui/skill-icons/lambert/hacker-pulse.png',
  'lena-buldak-breath': 'assets/concepts/campaigns/penisuela/ui/skill-icons/golovach-lena/buldak-breath.png',
  'lena-forgot-clothes': 'assets/concepts/campaigns/penisuela/ui/skill-icons/golovach-lena/forgot-clothes.png',
  'lena-name-story': 'assets/concepts/campaigns/penisuela/ui/skill-icons/golovach-lena/name-story.png',
  'lena-creative-crisis': 'assets/concepts/campaigns/penisuela/ui/skill-icons/golovach-lena/creative-crisis.png',
  'lena-video-surveillance-guards': 'assets/concepts/campaigns/penisuela/ui/skill-icons/golovach-lena/video-surveillance.png',
  'thorin-hypnotic-smile': 'assets/concepts/campaigns/penisuela/ui/skill-icons/thorin-pukoshchit/hypnotic-smile.png',
  'thorin-helping-stick': 'assets/concepts/campaigns/penisuela/ui/skill-icons/thorin-pukoshchit/helping-stick.png',
  'thorin-work-until-pulse-drops': 'assets/concepts/campaigns/penisuela/ui/skill-icons/thorin-pukoshchit/work-until-pulse-drops.png',
  'thorin-beast-understanding': 'assets/concepts/campaigns/penisuela/ui/skill-icons/thorin-pukoshchit/beast-understanding.png',
  'thorin-needle-guards': 'assets/concepts/campaigns/penisuela/ui/skill-icons/thorin-pukoshchit/needle-in-haystack.png',
};
const itemIcons: Record<string, string> = {
  'bubsilda-vomit-bag': 'assets/concepts/campaigns/penisuela/ui/item-icons/bubsilda/vomit-bag.png',
  'bubsilda-comfort-cloak': 'assets/concepts/campaigns/penisuela/ui/item-icons/bubsilda/comfort-cloak.png',
  'bubsilda-ice-heart': 'assets/concepts/campaigns/penisuela/ui/item-icons/bubsilda/ice-heart.png',
  'bubsilda-yellow-snowball-guards': 'assets/concepts/campaigns/penisuela/ui/item-icons/bubsilda/yellow-snowball.png',
  'linda-healing-pollen': 'assets/concepts/campaigns/penisuela/ui/item-icons/linda/healing-pollen.png',
  'linda-blinding-pollen': 'assets/concepts/campaigns/penisuela/ui/item-icons/linda/blinding-pollen.png',
  'linda-pitahaya-reserve': 'assets/concepts/campaigns/penisuela/ui/item-icons/linda/pitahaya-reserve.png',
  'lambert-lego-engineer': 'assets/concepts/campaigns/penisuela/ui/item-icons/lambert/lego-engineer.png',
  'lambert-gold-coin': 'assets/concepts/campaigns/penisuela/ui/item-icons/lambert/gold-coin.png',
  'lambert-hud-helmet-guards': 'assets/concepts/campaigns/penisuela/ui/item-icons/lambert/hud-helmet.png',
  'lambert-tools': 'assets/concepts/campaigns/penisuela/ui/item-icons/lambert/tools.png',
  'lena-buldak-noodles': 'assets/concepts/campaigns/penisuela/ui/item-icons/golovach-lena/buldak-noodles.png',
  'lena-dragonborn-armour': 'assets/concepts/campaigns/penisuela/ui/item-icons/golovach-lena/dragonborn-armour.png',
  'lena-sleep-scroll': 'assets/concepts/campaigns/penisuela/ui/item-icons/golovach-lena/sleep-scroll.png',
  'lena-camera-pendant': 'assets/concepts/campaigns/penisuela/ui/item-icons/golovach-lena/camera-pendant.png',
  'thorin-seven-job-bag': 'assets/concepts/campaigns/penisuela/ui/item-icons/thorin-pukoshchit/seven-job-bag.png',
  'thorin-moskvin-herald': 'assets/concepts/campaigns/penisuela/ui/item-icons/thorin-pukoshchit/moskvin-herald.png',
  'thorin-ration-pouch': 'assets/concepts/campaigns/penisuela/ui/item-icons/thorin-pukoshchit/ration-and-potion-pouch.png',
  'thorin-shift-bell': 'assets/concepts/campaigns/penisuela/ui/item-icons/thorin-pukoshchit/shift-bell.png',
};

function getAbilityGlyph(action: CombatActionView) {
  if (abilityGlyphs[action.id]) return abilityGlyphs[action.id];
  if (action.activation === 'passive') return '◆';
  if (action.activation === 'movement') return '↟';
  if (action.activation === 'bonus') return '↕';
  if (action.activation === 'attack') return '⚔';
  return '✦';
}

function comparePassiveFirst(left: CombatActionView, right: CombatActionView) {
  return Number(right.activation === 'passive') - Number(left.activation === 'passive');
}

export function CombatActionTray({
  actions,
  activeId,
  onClearPreview,
  onBasicAttack,
  onEquipItem,
  onSelectAction,
  previewActionId,
  selectedActionIds,
}: CombatActionTrayProps) {
  const [activeSection, setActiveSection] = useState<'abilities' | 'items'>('abilities');
  const abilities = actions
    .filter((action) => action.source === 'ability')
    .sort(comparePassiveFirst);
  const items = actions
    .filter((action) => action.source === 'item')
    .sort(comparePassiveFirst);
  const visibleActions = activeSection === 'abilities' ? abilities : items;
  const arcStyle = (index: number, total: number) => {
    const midpoint = Math.max((total - 1) / 2, 1);
    const distance = Math.abs(index - midpoint) / midpoint;
    return {'--action-arc-y': `${Math.round(distance * distance * 30)}px`} as CSSProperties;
  };

  useEffect(() => {
    setActiveSection('abilities');
  }, [activeId]);

  return (
    <section className={styles.tray} aria-label="Умения и предметы">
      <div className={styles.heading}>
        <button className={styles.basicAttack} type="button" onClick={onBasicAttack}
          aria-pressed={previewActionId === null && !actions.some((action) => action.activation !== 'passive' && selectedActionIds.includes(action.id))}>
          Обычная атака
        </button>
        <div className={styles.sectionTabs} role="tablist" aria-label="Тип боевого действия">
          <button
            aria-selected={activeSection === 'abilities'}
            className={activeSection === 'abilities' ? styles.activeSectionTab : undefined}
            role="tab"
            type="button"
            onClick={() => {
              onClearPreview();
              setActiveSection('abilities');
            }}
          >
            Навыки <span>{abilities.length}</span>
          </button>
          <button
            aria-selected={activeSection === 'items'}
            className={activeSection === 'items' ? styles.activeSectionTab : undefined}
            role="tab"
            type="button"
            onClick={() => {
              onClearPreview();
              setActiveSection('items');
            }}
          >
            Предметы <span>{items.length}</span>
          </button>
        </div>
      </div>

      <div className={styles.actionList} role="tabpanel">
        {visibleActions.length ? visibleActions.map((action, index) => {
          const previewed = previewActionId === action.id;
          const selected = previewActionId !== null
            ? previewed
            : selectedActionIds.includes(action.id);
          const visiblyActive = previewActionId === null && action.active;
          const item = action.source === 'item';
          const passive = action.activation === 'passive';
          const skillIcon = abilityIcons[action.id];
          const actionArtwork = skillIcon ?? itemIcons[action.id];
          const costLabel = action.cost ? `${action.cost.turnLabel}. ${action.cost.limitLabel}. Осталось ${action.cost.badgeLabel}. ${action.cost.hint}` : '';
          const stateLabel = previewed
            ? passive ? 'Открыто описание пассивного эффекта' : item ? 'Открыто описание предмета' : 'Открыто описание навыка'
            : selected
              ? 'Выбран для следующего действия'
              : action.disabledReason ?? (item
                ? 'Выбрать предмет для действия'
                : `Доступен, использовано ${action.uses} из ${action.maxUses}`);
          return (
            <button
              className={`${styles.action} ${selected ? styles.selectedAction : ''} ${visiblyActive ? styles.activeAction : ''}`}
              type="button"
              key={action.id}
              style={arcStyle(index, visibleActions.length)}
              data-activation={action.activation}
              data-state={visiblyActive ? 'active' : selected ? 'selected' : action.disabled ? 'disabled' : 'ready'}
              aria-pressed={selected}
              onClick={() => {
                if (passive) onSelectAction(action.id);
                else if (action.disabled) onSelectAction(action.id);
                else if (item && selected) onSelectAction(action.id);
                else if (item) onEquipItem(action.id);
                else onSelectAction(action.id);
              }}
              title={`${action.name}. ${action.description}. ${costLabel}`}
              aria-label={`${action.name}. ${action.description}. ${stateLabel}. ${costLabel}`}
            >
              <span className={styles.orbVisual} aria-hidden="true">
                <img className={styles.orbFrame} src={resolveAsset(actionOrbFrame)} alt="" />
                {action.artwork ? <span className={styles.actionArtworkMask}><ArtworkFocus artwork={action.artwork} className={styles.actionArtwork} /></span> : actionArtwork
                  ? (
                      <span className={styles.actionArtworkMask}>
                        <img className={styles.actionArtwork} src={resolveAsset(actionArtwork)} alt="" />
                      </span>
                    )
                  : item
                    ? <img className={styles.actionIcon} src={resolveAsset(itemIcon)} alt="" />
                    : <span className={styles.actionGlyph}>{getAbilityGlyph(action)}</span>}
              </span>
              {passive ? <span className={styles.passiveMark} aria-hidden="true">◆</span> : null}
              {action.cost ? <span className={styles.resourceMark} aria-hidden="true">{action.cost.badgeLabel}</span> : null}
              <span className={styles.actionState} aria-hidden="true" />
            </button>
          );
        }) : (
          <div className={styles.emptySection}>
            <img src={resolveAsset(activeSection === 'abilities' ? abilityIcon : itemIcon)} alt="" />
            <span>
              <strong>{activeSection === 'abilities' ? 'Нет активных навыков' : 'Нет доступных предметов'}</strong>
              <small>{activeSection === 'abilities' ? 'Для этого героя и этой встречи навыки пока не опубликованы.' : 'В инвентаре героя нет предметов для этого боя.'}</small>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
