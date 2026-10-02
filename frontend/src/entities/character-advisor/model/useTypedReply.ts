import {useEffect, useState} from 'react';

// This is a presentation animation after receipt, not provider token streaming.
export function useTypedReply(text: string, animate: boolean) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const characters = Array.from(text);
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(characters.length);
      return;
    }
    setVisible(0);
    let frame = 0;
    let start: number | null = null;
    // Long answers finish within two seconds; short ones still feel like typing.
    const speed = Math.max(180, characters.length / 2);
    function tick(now: number) {
      start ??= now;
      const count = Math.min(characters.length, Math.floor((now - start) * speed / 1000));
      setVisible(count);
      if (count < characters.length) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, animate]);
  return animate ? Array.from(text).slice(0, visible).join('') : text;
}
