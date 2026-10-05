import { createClient, workload } from '../../client.mjs';

const clients = new Map();

// biome-ignore lint/style/noDefaultExport: Netlify function entry point
export default async (request) => {
  if (
    request.headers.get('authorization') !== `Bearer ${process.env.AUTH_SECRET}`
  ) {
    return new Response('Forbidden', { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const driver = params.get('driver');
  if (!['pg', 'postgres', 'postgres-serial'].includes(driver))
    return new Response('Invalid driver', { status: 400 });
  let client = clients.get(driver);
  if (!client) {
    client = createClient(driver, process.env.DATABASE_URL);
    clients.set(driver, client);
  }
  const started = performance.now();
  let timer;
  try {
    const rows = await Promise.race([
      workload(client, params.get('kind')),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Probe deadline exceeded')),
          6000,
        );
      }),
    ]);
    return Response.json(
      {
        driver,
        rows: rows.length,
        ms: performance.now() - started,
        commit: process.env.COMMIT_REF,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    clients.delete(driver);
    await client.close();
    return Response.json(
      {
        driver,
        error: error.code ?? error.message,
        ms: performance.now() - started,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  } finally {
    clearTimeout(timer);
  }
};
