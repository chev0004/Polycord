import { createConnection, createServer } from 'node:net';
import { connect } from 'node:tls';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };
import { sandboxResource } from './resources.mjs';

export const createProxy = async (remoteUrl) => {
  const remote = new URL(remoteUrl);
  sandboxResource(remote.href);
  const sockets = new Set();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.pause();
    let upstream = createConnection({
      host: remote.hostname,
      port: Number(remote.port),
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    socket.on('close', () => {
      sockets.delete(socket);
      upstream.destroy();
    });
    upstream.once('connect', () =>
      upstream.write(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47])),
    );
    upstream.once('data', (data) => {
      if (data[0] !== 83) return socket.destroy();
      upstream = connect({
        socket: upstream,
        servername: remote.hostname,
        ca,
        rejectUnauthorized: true,
      });
      upstream.on('error', () => socket.destroy());
      upstream.once('secureConnect', () => {
        socket.pipe(upstream).pipe(socket);
        socket.resume();
      });
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const local = new URL(remote);
  local.hostname = '127.0.0.1';
  local.port = String(server.address().port);
  return {
    url: local.href,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
};
