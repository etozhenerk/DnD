export function getPolygonCenter(polygon: [number, number][]): {x: number; y: number} {
  const sum = polygon.reduce(
    (result, [x, y]) => ({x: result.x + x, y: result.y + y}),
    {x: 0, y: 0},
  );

  return {x: sum.x / polygon.length, y: sum.y / polygon.length};
}
