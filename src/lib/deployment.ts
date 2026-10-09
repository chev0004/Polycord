export const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID;

const CHUNK_FAILURE =
  /ChunkLoadError|Loading (CSS )?chunk [^ ]+ failed|Failed to fetch dynamically imported module/;
const CHUNK_RELOAD_WINDOW_MS = 30000;

export const isChunkLoadFailure = (reason: unknown) =>
  CHUNK_FAILURE.test(
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : typeof reason === 'string'
        ? reason
        : '',
  );

export const claimChunkReload = () => {
  try {
    const last = Number(sessionStorage.getItem('polycord:chunk-reload'));
    if (Date.now() - last < CHUNK_RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem('polycord:chunk-reload', String(Date.now()));
    return true;
  } catch {
    return false;
  }
};

export const claimBuildReload = (buildId: string) => {
  try {
    if (sessionStorage.getItem('polycord:build-reload') === buildId)
      return false;
    sessionStorage.setItem('polycord:build-reload', buildId);
    return true;
  } catch {
    return false;
  }
};
