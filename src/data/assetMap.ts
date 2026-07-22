// Static asset map for local images.
// Metro requires static require() calls — dynamic requires don't work.
// Add new local assets here by importing them.

const assets: Record<string, number> = {
  'genre-comedy.jpg': require('../../assets/genre-comedy.jpg'),
  'genre-drama.jpg': require('../../assets/genre-drama.jpg'),
  'genre-action.jpg': require('../../assets/genre-action.jpg'),
  'genre-scifi.jpg': require('../../assets/genre-scifi.jpg'),
  'genre-horror.jpg': require('../../assets/genre-horror.jpg'),
  'genre-romance.jpg': require('../../assets/genre-romance.jpg'),
  'genre-thriller.jpg': require('../../assets/genre-thriller.jpg'),
  'genre-fantasy.jpg': require('../../assets/genre-fantasy.jpg'),
  'genre-animation.jpg': require('../../assets/genre-animation.jpg'),
  'genre-documentary.jpg': require('../../assets/genre-documentary.jpg'),
  'friends-apartment.png': require('../../assets/friends-apartment.png'),
  'TexasTheatre.png': require('../../assets/TexasTheatre.png'),
  'WrigleyField.png': require('../../assets/WrigleyField.png'),
  'FenwayPark.png': require('../../assets/FenwayPark.png'),
  'Hobbiton.png': require('../../assets/Hobbiton.png'),
};

export function getLocalAsset(path: string): number | null {
  // path is e.g. "TexasTheatre.png"
  return assets[path] ?? null;
}