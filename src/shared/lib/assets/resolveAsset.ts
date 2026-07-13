const assetModules = import.meta.glob('../../../../assets/**/*.{png,jpg,jpeg,webp,mp4}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function resolveAsset(path: string): string {
  return assetModules[`../../../../${path}`] ?? path;
}
