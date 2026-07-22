// Static asset map for local images.
// Metro requires static require() calls — dynamic requires don't work.
// Add new local assets here by importing them.

const assets: Record<string, number> = {
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