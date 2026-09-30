import type {ButtonHTMLAttributes} from 'react';
import styles from './ActionButton.module.css';

export type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary';
};

export function ActionButton({tone = 'primary', className, type = 'button', ...props}: ActionButtonProps) {
  return <button {...props} type={type} className={[styles.button, styles[tone], className].filter(Boolean).join(' ')} />;
}
