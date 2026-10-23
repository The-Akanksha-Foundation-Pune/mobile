require("./lib/env");
const net = require("net");
const app = require("./app");

const port = Number(process.env.PORT || 4000);

/** On macOS a second bind to a busy port can look successful and then exit silently, so probe first. */
function portInUse(target) {
  return new Promise((resolve) => {
    const socket = net.connect({ port: target, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

(async () => {
  if (await portInUse(port)) {
    console.error(
      `Port ${port} is already in use: another backend is running.\n` +
        `Keep using that one, or stop it first: lsof -iTCP:${port} -sTCP:LISTEN, then kill <PID>.`
    );
    process.exit(1);
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`Capture Akanksha backend running on http://localhost:${port}`);
    console.log(`LAN devices can use http://<your-lan-ip>:${port}`);
  });
})();
