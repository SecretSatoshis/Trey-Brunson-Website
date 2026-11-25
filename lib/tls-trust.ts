import { createHash, X509Certificate } from "node:crypto";
import { getCACertificates, setDefaultCACertificates } from "node:tls";
import { existsSync, readFileSync } from "node:fs";

// eMudhra compromised intermediates can chain through these roots, including
// Sectigo cross-signs. Public-key hashes also cover differently encoded copies.
// https://github.com/Homebrew/homebrew-core/blob/d02b8762f4a29859c47a635a0d2683223fea9812/Formula/c/ca-certificates.rb
const blockedRootKeys = new Set([
  "bd153ed7b0434f6886b17bce8bbe84ed340c7132d702a8f4fa318f756ecbd6f3",
  "c619e4780ed8e0abeda24ad732567de4383a7ea941338f6d1a7d1b49ac792fe9",
  "8d417db2dd8bf5e3084d1e3f196d583849d81bdd4c00c70b9d39369e96b8c782",
]);

const STANDARD_CA_BUNDLE_PATHS = [
  "/etc/ssl/certs/ca-certificates.crt",
  "/etc/pki/tls/certs/ca-bundle.crt",
  "/etc/ssl/cert.pem",
  "/etc/ssl/ca-bundle.pem",
];

const PEM_BLOCK_PATTERN =
  /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;

function readPemBundle(filePath: string): string[] {
  try {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, "utf8").match(PEM_BLOCK_PATTERN) ?? [];
  } catch (error) {
    console.warn(`[tls-trust] Failed to read CA bundle at ${filePath}:`, error);
    return [];
  }
}

export function filterTrustedCertificates(certificates: readonly string[]): string[] {
  const trusted: string[] = [];
  for (const pem of certificates) {
    try {
      const key = new X509Certificate(pem).publicKey.export({
        type: "spki",
        format: "der",
      });
      if (!blockedRootKeys.has(createHash("sha256").update(key).digest("hex"))) {
        trusted.push(pem);
      }
    } catch (error) {
      console.warn("[tls-trust] Skipping malformed CA certificate entry:", error);
    }
  }
  return trusted;
}

function loadCandidateCertificates(): readonly string[] {
  // Node cannot enumerate the OpenSSL default store in --use-openssl-ca mode,
  // so getCACertificates("default") can be empty when SSL_CERT_FILE is unset.
  const defaultCerts = getCACertificates("default");
  if (defaultCerts.length) return defaultCerts;

  if (process.env.SSL_CERT_FILE) {
    const envCerts = readPemBundle(process.env.SSL_CERT_FILE);
    if (envCerts.length) return envCerts;
  }

  try {
    const systemCerts = getCACertificates("system");
    if (systemCerts.length) return systemCerts;
  } catch (error) {
    console.warn("[tls-trust] Unable to enumerate system CA certificates:", error);
  }

  for (const bundlePath of STANDARD_CA_BUNDLE_PATHS) {
    const bundleCerts = readPemBundle(bundlePath);
    if (bundleCerts.length) return bundleCerts;
  }

  const bundledCerts = getCACertificates("bundled");
  if (bundledCerts.length) {
    console.warn(
      "[tls-trust] Falling back to Node bundled CA certificates because no OpenSSL/system CA store could be enumerated.",
    );
    return bundledCerts;
  }

  return [];
}

// Run before outbound requests. Node 24.5+/22.19+ replaces the default trust
// list for this thread; normal certificate and hostname verification stay on.
export function hardenTlsTrust(): number {
  const current = loadCandidateCertificates();
  const trusted = filterTrustedCertificates(current);
  if (!trusted.length) throw new Error("No trusted TLS certificate authorities remain");
  setDefaultCACertificates(trusted);
  return current.length - trusted.length;
}
