/** Resize without cropping; canvas encoding drops source metadata and preserves PNG alpha. */
export async function prepareImage(file: File, maxEdge: number, maxBytes: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Не удалось подготовить изображение. Попробуйте другой браузер.');
    let type = file.type === 'image/jpeg' ? 'image/jpeg' : '';
    let scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 12; attempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (!type) type = hasTransparency(context, canvas.width, canvas.height) ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, .88));
      if (blob && blob.size <= maxBytes) return blob;
      scale *= .8;
    }
    throw new Error('Изображение слишком большое. Выберите файл меньшего размера.');
  } finally {
    bitmap.close();
  }
}

function hasTransparency(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  const pixels = context.getImageData(0, 0, width, height).data;
  for (let alpha = 3; alpha < pixels.length; alpha += 4) {
    if (pixels[alpha] !== 255) return true;
  }
  return false;
}
