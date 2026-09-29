import {useEffect, useRef} from 'react';
import type {ManualCheckRewardDefinition} from '../../../../entities/campaign-session/model/galleryGameplay';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {ManualCheckRewardNotice} from '../../model/manualCheckRewards';
import {SceneDecisionModal} from '../SceneDecisionModal/SceneDecisionModal';
import styles from './ManualCheckRewardDialog.module.css';

interface Props {reward: ManualCheckRewardDefinition; notice: ManualCheckRewardNotice; onClose: () => void}

export function ManualCheckRewardDialog({reward, notice, onClose}: Props) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    button.current?.focus();
    return () => {if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();};
  }, []);

  return <SceneDecisionModal open dismissible={false} layer="reward" eyebrow="Награда" title={reward.name} onClose={onClose} options={[]}>
    <div className={styles.reward} onKeyDown={event => {
      if (event.key === 'Tab') {event.preventDefault(); event.stopPropagation();}
      if (event.key === 'Escape') {event.stopPropagation(); onClose();}
    }}>
      <img className={styles.coin} src={resolveAsset(reward.artwork)} alt={reward.artworkAlt}/>
      <p>{notice.text}</p>
      <p className={styles.description}>{reward.description}</p>
      <button ref={button} type="button" onClick={onClose}>{reward.claimLabel}</button>
    </div>
  </SceneDecisionModal>;
}
