import type {LocalImage} from './types';

export async function loadImages(files: readonly File[]) {
  const images: LocalImage[] = [];
  const problems: string[] = [];
  for (const file of files) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      problems.push('Подойдут PNG, JPG и WebP до 10 МБ.');
      continue;
    }
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      images.push({id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file)});
    } catch { problems.push('Не удалось открыть ' + file.name + '.'); }
  }
  return {images, problems};
}
