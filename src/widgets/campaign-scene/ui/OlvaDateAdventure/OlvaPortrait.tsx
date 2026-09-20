import {olvaQuest} from '../../../../entities/campaign-session/model/olvaQuest';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './OlvaPortrait.module.css';

export function OlvaPortrait({speakerId}: {speakerId: string}) {
  const speaker = olvaQuest.speakers.find(s => s.id === speakerId);
  if (!speaker) return null;
  return <svg className={styles.portrait} viewBox={speaker.portrait.viewBox.join(' ')} aria-hidden="true">
    <image href={resolveAsset(speaker.portrait.image)} width={speaker.portrait.width} height={speaker.portrait.height}/>
  </svg>;
}
