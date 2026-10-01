import styles from './TextField.module.css';

export type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  showCount?: boolean;
  rows?: number;
  required?: boolean;
};

export function TextField({label, value, onChange, placeholder, multiline, maxLength, showCount, rows = 2, required}: TextFieldProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}{required && <span aria-hidden="true"> *</span>}</span>
      <span className={styles.control}>{multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder} maxLength={maxLength} rows={rows} required={required} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder} maxLength={maxLength} required={required} />
      )}</span>
      {showCount && maxLength && <small className={styles.counter} aria-hidden="true">{value.length}/{maxLength}</small>}
    </label>
  );
}
