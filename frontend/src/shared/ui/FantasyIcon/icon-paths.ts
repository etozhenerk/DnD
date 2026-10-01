export const fantasyIconPaths = {
  fist: ['m5 13-2-4 2-2 3 3V4l3-1v6-6l3 1v6-5l3 1v6-3l3 1v6l-4 7H9l-4-5Z', 'm9 15 2-4 4 1'],
  feather: ['M4 21c0-8 4-16 16-18 1 9-4 16-13 17', 'M3 22 18 6', 'm7 15 7-1', 'm11 10 6-1'],
  heart: ['M12 21S2 15 2 8c0-6 8-7 10-2 2-5 10-4 10 2 0 7-10 13-10 13Z'],
  shield: ['m12 2 9 4v6c0 5-5 9-9 11-4-2-9-6-9-11V6Z', 'M12 6v12m-5-8 5-4 5 4'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
  book: ['M12 5v16M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Z', 'm5 8 4 1M5 12l4 1m6-4 4-1m-4 5 4-1'],
  sun: ['M12 1v5m0 12v5M1 12h5m12 0h5M4 4l4 4m8 8 4 4M4 20l4-4m8-8 4-4', 'M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z'],
  upload: ['M12 16V2m-5 5 5-5 5 5M3 13v8h18v-8'],
} as const;

export type FantasyIconName = keyof typeof fantasyIconPaths;
