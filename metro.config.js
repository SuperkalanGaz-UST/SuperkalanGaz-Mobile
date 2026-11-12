// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SVG artwork is imported as XML for react-native-svg on web and native.
config.resolver.assetExts = config.resolver.assetExts.filter(extension => extension !== 'svg');
config.resolver.sourceExts.push('svg');
config.transformer.babelTransformerPath = require.resolve('./mascot-transformer');

module.exports = config;
