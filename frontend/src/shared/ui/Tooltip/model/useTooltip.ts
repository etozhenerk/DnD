import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import type {CSSProperties} from 'react';
import {positionTooltip} from './position-tooltip';

export function useTooltip() {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({left: 0, top: 0});

  function cancelClose() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function close() {
    cancelClose();
    pinned.current = false;
    setOpen(false);
  }
  function enter() {
    cancelClose();
    setOpen(true);
  }
  function leave() {
    cancelClose();
    if (!pinned.current && !focused.current) timer.current = setTimeout(() => setOpen(false), 120);
  }

  useLayoutEffect(() => {
    if (!open) return;
    function update() {
      if (trigger.current && popup.current) {
        setPosition(positionTooltip(trigger.current.getBoundingClientRect(), popup.current.getBoundingClientRect(), window.innerWidth, window.innerHeight));
      }
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const observer = new ResizeObserver(update);
    if (popup.current) observer.observe(popup.current);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !trigger.current?.contains(event.target) && !popup.current?.contains(event.target)) close();
    };
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return {
    id, trigger, popup, open,
    style: {'--tooltip-left': position.left + 'px', '--tooltip-top': position.top + 'px'} as CSSProperties,
    enter, leave,
    focus: () => { focused.current = true; enter(); },
    blur: () => { focused.current = false; close(); },
    toggle: () => {
      cancelClose();
      pinned.current = !pinned.current;
      setOpen(pinned.current);
    },
  };
}
