const ts = require('typescript');

module.exports = function instrument(source) {
  const story = ts.createSourceFile(
    this.resourcePath,
    source,
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
      source,
    );
};
