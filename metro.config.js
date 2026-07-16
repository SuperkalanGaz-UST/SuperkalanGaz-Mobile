// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep the raw "Figma Make" web source (Vite + Tailwind + shadcn) out of Metro's
// bundle and haste map. It is the design source the RN screens were ported from,
// not shippable native code — bundling it would pull in web-only deps.
config.resolver.blockList = [/[/\\]Figma Make[/\\].*/];

module.exports = config;
