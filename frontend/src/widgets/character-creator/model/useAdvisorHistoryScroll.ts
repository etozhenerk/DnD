import {useEffect, useRef} from 'react';

export function useAdvisorHistoryScroll() {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    const element = viewport.current;
    const body = content.current;
    if (!element || !body) return;
    element.scrollTop = element.scrollHeight;
    const observer = new ResizeObserver(() => {
      if (follow.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(body);
    return () => observer.disconnect();
  }, []);
  return {viewport, content, onScroll: () => {
    const element = viewport.current;
    if (element) follow.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  }};
}
