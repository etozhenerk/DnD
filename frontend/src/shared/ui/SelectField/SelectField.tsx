import styles from './SelectField.module.css';

export type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly {value: string; label: string; disabled?: boolean}[];
};

export function SelectField({label, value, onChange, options}: SelectFieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </label>
  );
}
