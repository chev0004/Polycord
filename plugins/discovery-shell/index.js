const { copyFile, mkdir, readFile } = require('node:fs/promises');
const { join } = require('node:path');

module.exports = {
  async onBuild({ constants }) {
    const manifest = JSON.parse(
      await readFile(
        join(constants.PUBLISH_DIR, 'prerender-manifest.json'),
        'utf8',
      ),
    );
    const destination = '.netlify/static/__discovery_shell';
    await mkdir(destination, { recursive: true });
    for (const locale of ['en', 'ja']) {
      if (manifest.routes[`/${locale}`]?.initialRevalidateSeconds !== false) {
        throw new Error(`Discovery shell /${locale} must be fully prerendered`);
      }
      await copyFile(
        join(constants.PUBLISH_DIR, `server/app/${locale}.html`),
        join(destination, `${locale}.html`),
      );
    }
  },
};
