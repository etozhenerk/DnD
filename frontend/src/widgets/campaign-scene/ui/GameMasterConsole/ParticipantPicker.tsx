import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './ParticipantPicker.module.css';

interface Props {
  label: string;
  participants: Array<{id: string; name: string; token?: string; hp: number; maxHp: number}>;
  selectedId: string;
  onSelect: (id: string) => void;
}
export function ParticipantPicker({label, participants, selectedId, onSelect}: Props) {
  return <div className={styles.picker} role="group" aria-label={label}>
    {participants.map(participant => <button key={participant.id} type="button" aria-pressed={participant.id === selectedId}
      aria-label={`Редактировать: ${participant.name}`} onClick={() => onSelect(participant.id)} className={styles.participant}>
      <span className={styles.portrait}>{participant.token ? <img src={resolveAsset(participant.token)} alt=""/> : <span aria-hidden="true">{participant.name.slice(0,1)}</span>}</span>
      <strong>{participant.name}</strong><small>{participant.hp} / {participant.maxHp} HP</small>
    </button>)}
  </div>;
}
