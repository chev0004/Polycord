import { afterEach, describe, expect, it } from 'bun:test';
import { clientIp, normalizeIp } from './clientIp';

afterEach(() => {
  delete process.env.POLYCORD_CLIENT_IP_HEADER;
});

describe('normalizeIp', () => {
  it('keeps plain IPv4 addresses', () => {
    expect(normalizeIp('198.51.100.7')).toBe('198.51.100.7');
  });

  it('compresses and lower-cases IPv6 addresses', () => {
    expect(normalizeIp('2001:0DB8:0:0:0:0:0:7A')).toBe('2001:db8::7a');
    expect(normalizeIp('[2001:db8::7a]')).toBe('2001:db8::7a');
    expect(normalizeIp(' ::1 ')).toBe('::1');
  });

  it('drops zone ids', () => {
    expect(normalizeIp('fe80::1%eth0')).toBe('fe80::1');
  });

  it('turns IPv4-mapped IPv6 into IPv4', () => {
    expect(normalizeIp('::ffff:198.51.100.7')).toBe('198.51.100.7');
    expect(normalizeIp('::FFFF:c633:6407')).toBe('198.51.100.7');
  });

  it('rejects anything that is not a single address', () => {
    expect(normalizeIp('198.51.100.7, 203.0.113.9')).toBeNull();
    expect(normalizeIp('not-an-ip')).toBeNull();
    expect(normalizeIp('')).toBeNull();
    expect(normalizeIp(null)).toBeNull();
  });
});

describe('clientIp', () => {
  it('reads only the trusted proxy header', () => {
    const headers = new Headers({
      'x-nf-client-connection-ip': '198.51.100.7',
      'x-forwarded-for': '203.0.113.9',
      'x-real-ip': '203.0.113.10',
    });

    expect(clientIp(headers)).toBe('198.51.100.7');
  });

  it('ignores forwarding headers when the trusted header is missing', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9' });

    expect(clientIp(headers)).toBeNull();
  });

  it('honours a configured header name', () => {
    process.env.POLYCORD_CLIENT_IP_HEADER = 'x-proxy-ip';
    const headers = new Headers({
      'x-proxy-ip': '2001:db8::1',
      'x-nf-client-connection-ip': '198.51.100.7',
    });

    expect(clientIp(headers)).toBe('2001:db8::1');
  });
});
