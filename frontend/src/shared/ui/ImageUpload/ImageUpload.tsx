import {FantasyIcon} from '../FantasyIcon';
import styles from './ImageUpload.module.css';

export type ImageUploadProps = {
  label: string;
  src?: string;
  onUpload: (files: FileList | null) => void;
};

export function ImageUpload({label, src, onUpload}: ImageUploadProps) {
  return (
    <label className={styles.upload}>
      {src ? <img src={src} alt="" /> : <FantasyIcon name="upload" />}
      <span>{label}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" aria-label={label}
        onChange={(event) => { onUpload(event.target.files); event.target.value = ''; }} />
    </label>
  );
}
