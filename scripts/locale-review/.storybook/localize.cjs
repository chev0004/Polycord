module.exports = function localize(source) {
  const locale = this.resourcePath.endsWith('ja.json') ? 'ja' : 'en';
  return `import { localize } from '@locale-review/tags';
export default localize(${source}, '${locale}');`;
};
