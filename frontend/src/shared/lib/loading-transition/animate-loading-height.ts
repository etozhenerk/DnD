export function animateLoadingHeight(element: HTMLElement, previousHeight: number) {
  const height = element.getBoundingClientRect().height;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || Math.abs(height - previousHeight) < 1 || typeof element.animate !== 'function') return;

  const styles = window.getComputedStyle(element);
  const duration = Number.parseFloat(styles.getPropertyValue('--fantasy-loading-duration'));
  element.dataset.resizing = 'true';
  const animation = element.animate([{height: `${previousHeight}px`}, {height: `${height}px`}], {
    duration,
    easing: styles.getPropertyValue('--fantasy-motion-ease').trim(),
  });
  const cancel = () => {
    animation.cancel();
    delete element.dataset.resizing;
  };
  animation.onfinish = cancel;
  motion.addEventListener('change', cancel);
  window.addEventListener('resize', cancel);
  return () => {
    motion.removeEventListener('change', cancel);
    window.removeEventListener('resize', cancel);
    cancel();
  };
}
