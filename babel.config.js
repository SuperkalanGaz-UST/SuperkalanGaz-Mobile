module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // `@/*` -> `src/*` path alias, kept in sync with tsconfig.json.
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: { '@': './src' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
    ],
  };
};
