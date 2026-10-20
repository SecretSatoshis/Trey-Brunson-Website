export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { hardenTlsTrust } = await import("./lib/tls-trust");
  hardenTlsTrust();
}
