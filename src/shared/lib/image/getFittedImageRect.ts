export function getFittedImageRect(containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number, fit: 'cover' | 'contain') {
  const scale = Math[fit === 'contain' ? 'min' : 'max'](containerWidth / imageWidth, containerHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {x: (containerWidth - width) / 2, y: (containerHeight - height) / 2, width, height};
}
