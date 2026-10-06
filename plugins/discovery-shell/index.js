const { copyFile, mkdir, readFile } = require('node:fs/promises');
const { join } = require('node:path');

module.exports = {
  async onPostBuild({ constants }) {
    const manifest = JSON.parse(
      await readFile('.next/prerender-manifest.json', 'utf8'),
    );
    const destination = join(constants.PUBLISH_DIR, '__discovery_shell');
    await mkdir(destination, { recursive: true });
    for (const locale of ['en', 'ja']) {
      if (manifest.routes[`/${locale}`]?.initialRevalidateSeconds !== false) {
        throw new Error(`Discovery shell /${locale} must be fully prerendered`);
      }
      await copyFile(
        `.next/server/app/${locale}.html`,
        join(destination, `${locale}.html`),
      );
    }
  },
};
