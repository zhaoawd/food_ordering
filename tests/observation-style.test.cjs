/* global __dirname */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const flatten = value => Array.isArray(value) ? Object.assign({}, ...value.map(flatten)) : value || {};
const native = {Text: 'native-text', StyleSheet: {flatten}};
const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../verification/observation.tsx'), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022},
}).outputText;
const exportsObject = {};
vm.runInNewContext(output, {exports: exportsObject, require(name) {
  if (name === 'react-native') return native;
  if (name === 'expo-file-system') return {};
  if (name === '@/verification/runtime') return {isVerificationBuild: false};
  return require(name);
}});
const observe = (style, children) => flatten(exportsObject.pressableObservationStyle(style, children));
const label = style => React.createElement(native.Text, {style}, 'Label');
test('button observes selected and unselected label colors without replacing its frame', () => {
  for (const selected of [false, true]) {
    const style = {width: 92, height: 44, backgroundColor: '#FFF9F1'};
    const result = observe(style, [label([{color: '#333333', width: 40}, selected && {color: '#B94A00'}]), null]);
    assert.equal(result.color, selected ? '#B94A00' : '#333333');
    assert.equal(result.width, 92);
    assert.equal(result.height, 44);
    assert.equal(result.backgroundColor, '#FFF9F1');
  }
});
test('ambiguous and absent labels do not fabricate a color', () => {
  for (const children of [null, label({}), [label({color: 'red'}), label({color: 'blue'})]])
    assert.equal(observe({width: 92}, children).color, undefined);
});
test('render-prop and nested component are not executed by observation', () => {
  const unread = () => {throw new Error('must not execute children')};
  assert.equal(observe({}, unread).color, undefined);
  assert.equal(observe({}, React.createElement(unread)).color, undefined);
});
