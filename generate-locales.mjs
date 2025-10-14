import fs from 'node:fs';
import path from 'node:path';

const localesDir = path.resolve(process.cwd(), 'src/locales');
const outputPath = path.resolve(process.cwd(), 'src/utils/locales.ts');

try {
  const files = fs.readdirSync(localesDir);

  const locales = files
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace('.json', ''))
    .sort();

  const fileContent = `export const locales = ${JSON.stringify(locales)} as const;\n`;

  fs.writeFileSync(outputPath, fileContent, 'utf8');

  console.log(
    `Successfully generated locales for Storybook: [${locales.join(', ')}]`,
  );
  console.log(`   File saved to: ${outputPath}`);
} catch (error) {
  console.error('Failed to generate locales for Storybook:', error);
  process.exit(1);
}
