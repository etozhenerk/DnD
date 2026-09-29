import {useId, useRef, useState} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {CombatEffectMotion} from '../../../campaign-scene/ui/CombatArena/CombatEffectMotion';
import {CombatEffectGlyph} from '../../../campaign-scene/ui/CombatArena/CombatEffectGlyph';
import {combatEffectPreview} from '../../model/combatEffectPreview';
import {useCombatEffectFeedback} from '../../../campaign-scene/model/useCombatEffectFeedback';
import styles from './CombatEffectsPreview.module.css';

export function CombatEffectsPreview({token}: {token: string}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState('all');
  const [applied, setApplied] = useState(false);
  const samples = combatEffectPreview.filter((effect) => selection === 'all' || selection === effect.id);
  const feedback = useCombatEffectFeedback(open ? samples.map((effect) => ({id: effect.id, effects: applied ? [effect] : []})) : []);
  return <>
    <button type="button" aria-haspopup="dialog" onClick={() => {setOpen(true); dialog.current?.showModal();}}>Эффекты</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={() => {setOpen(false); setApplied(false);}}>
      <header className={styles.header}>
        <div><h2 id={titleId}>Анимации эффектов</h2><p>Применение → короткая анимация → значок. Состояние боя не меняется.</p></div>
        <button type="button" aria-label="Закрыть анимации эффектов" onClick={() => dialog.current?.close()}>×</button>
      </header>
      <div className={styles.controls}>
        <label>Эффект <select value={selection} onChange={(event) => setSelection(event.target.value)}>
          <option value="all">Все эффекты</option>
          {combatEffectPreview.map((effect) => <option key={effect.id} value={effect.id}>{effect.shortLabel}</option>)}
        </select></label>
        <button type="button" disabled={applied} onClick={() => setApplied(true)}>Наложить эффекты</button>
        <button type="button" disabled={!applied} onClick={() => setApplied(false)}>Снять эффекты</button>
      </div>
      <div className={styles.grid}>
        {open && samples.map((effect) => <figure key={effect.id} className={styles.sample}>
          <div className={styles.token}>
            <CombatEffectMotion cue={feedback.cueFor(effect.id)}>
              <img className={styles.portrait} src={resolveAsset(token)} alt="" />
            </CombatEffectMotion>
          </div>
          <figcaption title={effect.label}><CombatEffectGlyph visual={effect.visual} /> {effect.shortLabel}</figcaption>
          <span className={styles.state}>{feedback.cueFor(effect.id) ? 'Применение…' : applied ? 'Действует' : 'Нет эффекта'}</span>
        </figure>)}
      </div>
    </dialog>
  </>;
}
