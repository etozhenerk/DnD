import {olvaQuest} from '../../../../entities/campaign-session/model/olvaQuest';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './OlvaCallingCardMark.module.css';

export function OlvaCallingCardMark() {
  return <img className={styles.artwork} src={resolveAsset(olvaQuest.callingCardArtwork)} alt="Горизонтальный силуэт лежащей женщины в платье" draggable={false}/>;
}
