const { basename } = require('node:path');
const expoTransformer = require('@expo/metro-config/babel-transformer');

// Pose-local bounds include a small margin around the traced paths. The group's
// transform positions it on the sheet and is replaced by this standalone viewBox.
const poseBounds = {
  'thumbs-up': '0 0 602 864',
  celebrating: '0 0 660 872',
  'wink-and-point': '0 0 598 860',
  'thumbs-up-smile': '0 0 584 859',
  confident: '0 0 458 850',
  thinking: '0 0 518 886',
  sad: '0 0 564 839',
};

module.exports.transform = ({ src, filename, ...options }) => {
  if (basename(filename) === 'superkalan-gaz-mascot-sheet-png-traced.svg') {
    const poses = {};
    for (const [id, bounds] of Object.entries(poseBounds)) {
      const group = src.match(new RegExp(`<g id="${id}"[^>]*>([\\s\\S]*?)</g>`));
      if (!group) throw new Error(`Missing Superkalan Gaz mascot pose: ${id}`);
      poses[id] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds}">${group[1]}</svg>`;
    }
    src = `module.exports = ${JSON.stringify(poses)};`;
  } else if (filename.endsWith('.svg')) {
    src = `module.exports = ${JSON.stringify(src)};`;
  }
  return expoTransformer.transform({ src, filename, ...options });
};
