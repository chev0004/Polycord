const gatedPaths = [
  /^\/api\/discovery\/bootstrap$/,
  /^\/api\/voice\/[^/]+$/,
  /^\/api\/admin\/case$/,
];

export const isGatedPath = (pathname: string) =>
  gatedPaths.some((path) => path.test(pathname));
