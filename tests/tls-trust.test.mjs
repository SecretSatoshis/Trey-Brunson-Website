import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rootCertificates, getCACertificates } from 'node:tls';
import { filterTrustedCertificates, hardenTlsTrust } from '../lib/tls-trust.ts';

test('removes compromised CA keys while preserving unrelated trusted certificates', () => {
  const blocked = readFileSync(new URL('./fixtures/emudhra-compromised-root.txt', import.meta.url), 'utf8');
  const clean = filterTrustedCertificates(rootCertificates);
  assert.ok(clean.length > 100);
  assert.deepEqual(filterTrustedCertificates([...clean, blocked]), clean);
  assert.deepEqual(filterTrustedCertificates(clean), clean);
  assert.throws(() => filterTrustedCertificates(['not a certificate']));
});

test('installs a nonempty filtered default trust policy and is idempotent', () => {
  hardenTlsTrust();
  const trusted = getCACertificates('default');
  assert.ok(trusted.length > 100);
  assert.deepEqual(filterTrustedCertificates(trusted), trusted);
  assert.equal(hardenTlsTrust(), 0);
});
