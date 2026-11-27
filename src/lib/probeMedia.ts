import 'server-only';

import { execFile } from 'node:child_process';
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { path as ffprobePath } from 'ffprobe-static';

export const probeMedia = async (bytes: Buffer, entries: string[]) => {
  const directory = await mkdtemp(join(tmpdir(), 'polycord-media-'));
  const file = join(directory, 'media');
  try {
    await writeFile(file, bytes);
    const { stdout } = await promisify(execFile)(
      ffprobePath,
      [
        '-v',
        'error',
        '-protocol_whitelist',
        'file',
        ...entries,
        '-of',
        'json',
        file,
      ],
      { timeout: 10000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
    );
    return JSON.parse(stdout) as unknown;
  } finally {
    await unlink(file).catch(() => {});
    await rmdir(directory);
  }
};
