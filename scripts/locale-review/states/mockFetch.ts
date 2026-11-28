export function mockFetch(respond: (url: URL, init?: RequestInit) => unknown) {
  const original = globalThis.fetch;
  globalThis.fetch = Object.assign(
    async (...[input, init]: Parameters<typeof fetch>) => {
      const url = new URL(String(input), window.location.origin);
      if (!url.pathname.startsWith('/api/')) return original(input, init);
      const body = await respond(url, init);
      return body instanceof Response ? body : Response.json(body ?? {});
    },
    { preconnect: original.preconnect },
  );
  return () => {
    globalThis.fetch = original;
  };
}
