import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_DIR = join(process.cwd(), 'src');

const I18N_PROPS = [
  'placeholder',
  'title',
  'aria-label',
  'aria-description',
  'alt',
];

const SKIP_LINE_PATTERNS = [
  /^\s*\/\//,
  /^\s*\*/,
  /^\s*import\s/,
  /className[=]/,
  /console\.(log|error|warn|info)/,
  /<(path|svg|circle|rect|line|polygon|polyline|ellipse)\b/,
  /viewBox[=]/,
  /data-testid[=]/,
];

type Violation = {
  file: string;
  line: number;
  text: string;
  reason: string;
};

function findTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findTsxFiles(full));
    } else if (full.endsWith('.tsx') && !full.endsWith('.stories.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const rel = relative(process.cwd(), filePath);

  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.includes('/*')) inBlockComment = true;
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }

    if (SKIP_LINE_PATTERNS.some((p) => p.test(line))) continue;

    // <\/ instead of < avoids matching TypeScript generics like Promise<void>
    const jsxTextMatch = line.match(/>([^<]+)<\//);
    if (jsxTextMatch) {
      const rawText = jsxTextMatch[1];
      const stripped = rawText.replace(/\{[^}]*\}/g, '');
      const withoutEntities = stripped.replace(/&[a-zA-Z]+;/g, '').trim();
      if (/[a-zA-Z]{2,}/.test(withoutEntities)) {
        violations.push({
          file: rel,
          line: i + 1,
          text: trimmed,
          reason: `hardcoded text: "${withoutEntities.trim()}"`,
        });
      }
    }

    for (const prop of I18N_PROPS) {
      const propRegex = new RegExp(`${prop}="([^"]*[a-zA-Z]{3,}[^"]*)"`, 'g');
      const matches = line.matchAll(propRegex);
      for (const m of matches) {
        violations.push({
          file: rel,
          line: i + 1,
          text: trimmed,
          reason: `hardcoded ${prop}: "${m[1]}"`,
        });
      }
    }
  }

  return violations;
}

const files = findTsxFiles(SRC_DIR);
const allViolations: Violation[] = [];

for (const file of files) {
  allViolations.push(...checkFile(file));
}

if (allViolations.length > 0) {
  console.error(`\ni18n: found ${allViolations.length} hardcoded string(s)\n`);
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.reason}`);
    console.error(`    ${v.text}\n`);
  }
  console.error(
    'Use t() from useTranslations() and add keys to src/locales/en.json and src/locales/ja.json\n',
  );
  process.exit(1);
} else {
  console.log(`i18n: ${files.length} files checked, no hardcoded strings.`);
}
