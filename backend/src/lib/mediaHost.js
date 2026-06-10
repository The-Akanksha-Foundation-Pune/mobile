function isLoopbackHost(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function isPrivateLanHost(hostname) {
  if (!hostname) return false;
  if (isLoopbackHost(hostname)) return true;

  const parts = hostname.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isRewritableDevMediaHost(hostname) {
  return isPrivateLanHost(hostname);
}

module.exports = {
  isLoopbackHost,
  isPrivateLanHost,
  isRewritableDevMediaHost,
};
