export const isSameOrigin = (request: Request) =>
  request.headers.get('origin') === new URL(request.url).origin;
