import {useRef, useState} from 'react';
import {olvaQuest} from '../../../../entities/campaign-session/model/olvaQuest';
import {SceneDecisionModal} from '../SceneDecisionModal/SceneDecisionModal';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './PartyRestDialog.module.css';

interface RestHero {id: string; name: string; token?: string; hp: number; maxHp: number;}
interface Props {
  heroes: RestHero[];
  blockedReason?: string;
  onClose: () => void;
  onConfirm: () => boolean;
}

export function PartyRestDialog({heroes, blockedReason, onClose, onConfirm}: Props) {
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const confirm = () => {
    if (blockedReason || submitting.current) return;
    submitting.current = true;
    if (onConfirm()) onClose();
    else {
      submitting.current = false;
      setError('Карточка сейчас недоступна. Восстановление не применено.');
    }
  };
  return <SceneDecisionModal open size="wide" title={olvaQuest.reward.name} eyebrow="" optionsLabel=""
    description={blockedReason ?? olvaQuest.reward.effect}
    onClose={onClose} optionsInitiallyVisible options={[
      {id:'accept-rest',label:'Восстановить группу',disabled:Boolean(blockedReason),closeOnSelect:false,onSelect:confirm},
      {id:'cancel-rest',label:'Отмена',onSelect:onClose},
    ]}>
    <div className={styles.heroes}>
      {heroes.map(hero => <section key={hero.id} className={styles.hero} aria-label={hero.name}>
        {hero.token ? <img src={resolveAsset(hero.token)} alt="" className={styles.portrait}/> : null}
        <h3>{hero.name}</h3>
        <p>{hero.hp} / {hero.maxHp} HP</p>
        <p className={styles.preview}>+{Math.max(0, hero.maxHp - hero.hp)} HP → {hero.maxHp} / {hero.maxHp}</p>
      </section>)}
    </div>
    {error ? <p className={styles.error} role="status">{error}</p> : null}
  </SceneDecisionModal>;
}
