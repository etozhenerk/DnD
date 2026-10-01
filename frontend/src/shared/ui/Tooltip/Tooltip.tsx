import {createPortal} from 'react-dom';
import type {ReactNode} from 'react';
import {useTooltip} from './model/useTooltip';
import styles from './Tooltip.module.css';

export type TooltipProps = {label: string; children: ReactNode; warning?: boolean};

export function Tooltip({label, children, warning = false}: TooltipProps) {
  const tooltip = useTooltip();
  return (
    <span className={styles.anchor}>
      <button ref={tooltip.trigger} type="button" className={styles.trigger} data-warning={warning}
        aria-label={label} aria-describedby={tooltip.open ? tooltip.id : undefined}
        onPointerEnter={tooltip.enter} onPointerLeave={tooltip.leave}
        onFocus={tooltip.focus} onBlur={tooltip.blur} onClick={tooltip.toggle}>
        <span aria-hidden="true">{warning ? '!' : '?'}</span>
      </button>
      {tooltip.open && createPortal(
        <div ref={tooltip.popup} id={tooltip.id} role="tooltip" className={styles.popup} style={tooltip.style}
          onPointerEnter={tooltip.enter} onPointerLeave={tooltip.leave}>
          {children}
        </div>, document.body,
      )}
    </span>
  );
}
