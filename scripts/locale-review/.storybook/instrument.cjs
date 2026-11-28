const ts = require('typescript');

module.exports = function instrument(source) {
  const traced = source.replace(
    /(from\s+)(['"])next-intl\2/g,
    '$1$2@locale-review/intl$2',
  );
  if (!/\.stories\.[jt]sx?$/.test(this.resourcePath)) return traced;

  const story = ts.createSourceFile(
    this.resourcePath,
    traced,
    ts.ScriptTarget.Latest,
    true,
  );
  const offsets = [];
  function visit(node) {
    if (
      (ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'play'
    ) {
      offsets.push(node.name.getStart(story));
    }
    ts.forEachChild(node, visit);
  }
  visit(story);
  return offsets
    .reverse()
    .reduce(
      (code, offset) =>
        `${code.slice(0, offset)}reviewFixturePlay${code.slice(offset + 4)}`,
      traced,
    );
};
