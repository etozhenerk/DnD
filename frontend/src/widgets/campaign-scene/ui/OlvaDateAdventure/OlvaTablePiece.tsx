import {useEffect, useRef, type ReactNode} from 'react';
import styles from './OlvaTablePiece.module.css';

interface Props {
  label: string;
  children: ReactNode;
  onOpen: () => void;
  onDrop: (x: number, y: number) => void;
  disabled?: boolean;
  variant?: string;
  selected?: boolean;
}

export function OlvaTablePiece({label, children, onOpen, onDrop, disabled = false, variant = 'object', selected = false}: Props) {
  const element = useRef<HTMLButtonElement>(null);
  const drag = useRef<{x: number; y: number; dx: number; dy: number} | null>(null);
  const moved = useRef(false);
  const frame = useRef<number | null>(null);
  const clear = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    drag.current = null;
    const node = element.current;
    if (node) {
      node.style.removeProperty('--drag-x');
      node.style.removeProperty('--drag-y');
      delete node.dataset.dragging;
    }
  };
  useEffect(() => clear, []);

  return <button ref={element} type="button" aria-label={label} aria-pressed={selected}
    className={styles.piece} data-variant={variant}
    onDragStart={event => event.preventDefault()}
    onPointerDown={event => {
      if (disabled || event.button !== 0) return;
      drag.current = {x: event.clientX, y: event.clientY, dx: 0, dy: 0};
      moved.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const current = drag.current;
      if (!current) return;
      current.dx = event.clientX - current.x;
      current.dy = event.clientY - current.y;
      if (Math.hypot(current.dx, current.dy) > 6) moved.current = true;
      if (!moved.current || frame.current !== null) return;
      // Only the dragged DOM layer moves. No React render or session replay per pointer event.
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const node = element.current;
        if (!node || !drag.current) return;
        node.dataset.dragging = 'true';
        node.style.setProperty('--drag-x', `${drag.current.dx}px`);
        node.style.setProperty('--drag-y', `${drag.current.dy}px`);
      });
    }}
    onPointerUp={event => {
      if (!drag.current) return;
      const didMove = moved.current;
      clear();
      if (didMove) onDrop(event.clientX, event.clientY);
    }}
    onPointerCancel={() => {moved.current = true; clear();}}
    onLostPointerCapture={() => {if (drag.current) clear();}}
    onClick={() => {
      if (moved.current) {moved.current = false; return;}
      onOpen();
    }}
  >{children}</button>;
}
