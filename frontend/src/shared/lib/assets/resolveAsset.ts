const assetModules = import.meta.glob('../../../../assets/**/*.{png,jpg,jpeg,webp,avif,mp4,mp3,ogg,wav,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function resolveAsset(path: string): string {
  return assetModules[`../../../../${path}`] ?? path;
}
