const instance = crypto.randomUUID();
const moduleAt = performance.now();
let framework;

// biome-ignore lint/style/noDefaultExport: Netlify entry point
export default async (request, context) => {
  const start = performance.now();
  const first = !framework;
  const importStart = performance.now();
  framework ??= import('./disc031-framework.mjs');
  const loaded = await framework;
  const importMs = performance.now() - importStart;
  const handlerStart = performance.now();
  const response = await loaded.default(request, context);
  const headers = new Headers(response.headers);
  headers.set(
    'x-disc031-runtime',
    JSON.stringify({
      id: request.headers.get('x-disc031-id'),
      instance,
      first,
      moduleAge: start - moduleAt,
      importMs,
      handlerMs: performance.now() - handlerStart,
      ms: performance.now() - start,
      runtime: process.version,
    }),
  );
  return new Response(response.body, { status: response.status, headers });
};

export const config = { path: '/*', preferStatic: true };
