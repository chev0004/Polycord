export const isSameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  return (
    origin !== null &&
    URL.canParse(origin) &&
    new URL(origin).host === request.headers.get('host')
  );
};
