export function positionTooltip(anchor: DOMRect, popup: DOMRect, width: number, height: number) {
  const margin = 12;
  const gap = 10;
  const left = Math.max(margin, Math.min(anchor.left + anchor.width / 2 - popup.width / 2, width - popup.width - margin));
  const below = anchor.bottom + gap;
  const above = anchor.top - popup.height - gap;
  const desiredTop = below + popup.height <= height - margin ? below : above;
  return {left, top: Math.max(margin, Math.min(desiredTop, height - popup.height - margin))};
}
