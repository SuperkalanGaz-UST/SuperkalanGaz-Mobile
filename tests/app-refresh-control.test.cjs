const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { RefreshControl, ScrollView, Text } = require('react-native-web');
const ts = require('typescript');

// Execute the actual TSX component against React Native Web, without Expo's
// native runtime. ScrollView must clone the custom control exactly as in Home.
function loadSource(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  const sourceModule = new Module(filename, module);
  sourceModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = sourceModule.require.bind(sourceModule);
  sourceModule.require = (id) => {
    if (id === 'react-native') return require('react-native-web');
    if (id.startsWith('@/')) return loadSource(`src/${id.slice(2)}.ts`);
    return originalRequire(id);
  };
  sourceModule._compile(compiled.outputText, filename);
  return sourceModule.exports;
}

const { AppRefreshControl } = loadSource('src/components/ui/AppRefreshControl.tsx');

test('a web ScrollView retains its screen content through AppRefreshControl', () => {
  const html = renderToStaticMarkup(React.createElement(
    ScrollView,
    {
      style: { flex: 1 },
      refreshControl: React.createElement(AppRefreshControl, {
        refreshing: false,
        onRefresh: () => {},
        onPrimary: true,
      }),
    },
    React.createElement(Text, null, 'What can we do for you today?'),
    React.createElement(Text, null, 'Order again'),
  ));
  assert.ok(html.includes('What can we do for you today?'), 'Home greeting was discarded');
  assert.ok(html.includes('Order again'), 'Home order content was discarded');
});

test('the custom refresh control retains the layout injected by ScrollView', () => {
  const render = (Control) => renderToStaticMarkup(React.createElement(
    ScrollView,
    {
      style: { flex: 1, backgroundColor: '#007BC1' },
      refreshControl: React.createElement(Control, {
        refreshing: false,
        onRefresh: () => {},
        accessibilityLabel: 'Refresh content',
      }),
    },
    React.createElement(Text, null, 'Profile'),
  ));
  // The outer web wrapper must receive the same flex sizing as an unwrapped
  // RefreshControl; otherwise its scrollable children have no viewport.
  assert.equal(render(AppRefreshControl).match(/^<div[^>]*>/)[0], render(RefreshControl).match(/^<div[^>]*>/)[0]);
});
