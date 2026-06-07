/**
 * i18n lint — catches hardcoded user-facing strings in TSX components.
 *
 * Any text visible to users should go through next-intl's t() function
 * so both locales (en + ja) stay in sync. This script flags English
 * strings that bypass the translation layer.
 *
 * Run: bun run check:i18n
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_DIR = join(process.cwd(), 'src');

// Props that hold user-facing text and must use translation keys
const I18N_PROPS = [
  'placeholder',
  'title',
  'aria-label',
  'aria-description',
  'alt',
];

// Lines matching any of these are skipped entirely
const SKIP_LINE_PATTERNS = [
  /^\s*\/\//, // single-line comment
  /^\s*\*/, // block-comment body
  /^\s*import\s/, // import statement
  /className[=]/, // className prop (CSS, not user-facing)
  /console\.(log|error|warn|info)/, // dev-only logging
  /<(path|svg|circle|rect|line|polygon|polyline|ellipse)\b/, // SVG elements
  /viewBox[=]/, // SVG viewBox attribute
  /data-testid[=]/, // test IDs
];

type Violation = {
  file: string;
  line: number;
  text: string;
  reason: string;
};

/** Recursively collect .tsx files, skipping stories and node_modules. */
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

/** Check one file for hardcoded user-facing strings. */
function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const rel = relative(process.cwd(), filePath);

  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track block comments
    if (trimmed.includes('/*')) inBlockComment = true;
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }

    // Skip non-relevant lines
    if (SKIP_LINE_PATTERNS.some((p) => p.test(line))) continue;

    // ---- Check 1: JSX text content between > and </ ----
    // Matches text on a single line like: >Some text</tag>
    // The <\/ ensures we match JSX closing tags, not TypeScript generics
    const jsxTextMatch = line.match(/>([^<]+)<\//);
    if (jsxTextMatch) {
      const rawText = jsxTextMatch[1];
      // Strip {expression} blocks — those use t() or variables
      const stripped = rawText.replace(/\{[^}]*\}/g, '');
      // Strip HTML entities like &nbsp; &mdash; etc.
      const withoutEntities = stripped.replace(/&[a-zA-Z]+;/g, '').trim();
      // Flag if remaining text has 2+ consecutive alphabetic characters
      if (/[a-zA-Z]{2,}/.test(withoutEntities)) {
        violations.push({
          file: rel,
          line: i + 1,
          text: trimmed,
          reason: `hardcoded text: "${withoutEntities.trim()}"`,
        });
      }
    }

    // ---- Check 2: i18n-sensitive props with hardcoded strings ----
    // Catches: placeholder="Enter email" but not placeholder={t('key')}
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

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

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
