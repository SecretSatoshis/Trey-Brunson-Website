import { createHash, X509Certificate } from "node:crypto";
import { getCACertificates, setDefaultCACertificates } from "node:tls";
import { readFileSync } from "node:fs";

// eMudhra compromised intermediates can chain through these roots, including
// Sectigo cross-signs. Public-key hashes also cover differently encoded copies.
// https://github.com/Homebrew/homebrew-core/blob/d02b8762f4a29859c47a635a0d2683223fea9812/Formula/c/ca-certificates.rb
const blockedRootKeys = new Set([
  "bd153ed7b0434f6886b17bce8bbe84ed340c7132d702a8f4fa318f756ecbd6f3",
  "c619e4780ed8e0abeda24ad732567de4383a7ea941338f6d1a7d1b49ac792fe9",
  "8d417db2dd8bf5e3084d1e3f196d583849d81bdd4c00c70b9d39369e96b8c782",
]);

export function filterTrustedCertificates(certificates: readonly string[]): string[] {
  return certificates.filter((pem) => {
    const key = new X509Certificate(pem).publicKey.export({
      type: "spki",
      format: "der",
    });
    return !blockedRootKeys.has(createHash("sha256").update(key).digest("hex"));
  });
}

// Run before outbound requests. Node 24.5+/22.19+ replaces the default trust
// list for this thread; normal certificate and hostname verification stay on.
export function hardenTlsTrust(): number {
  // Node cannot enumerate the OpenSSL default store in --use-openssl-ca mode.
  // Read the explicitly configured bundle rather than adding bundled trust.
  let current = getCACertificates("default");
  if (!current.length && process.env.SSL_CERT_FILE) {
    current = readFileSync(process.env.SSL_CERT_FILE, "utf8").match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
    ) ?? [];
  }
  const trusted = filterTrustedCertificates(current);
  if (!trusted.length) throw new Error("No trusted TLS certificate authorities remain");
  setDefaultCACertificates(trusted);
  return current.length - trusted.length;
}
