import { startServer } from "./bootstrap.js";
import { getConfig } from "./config.js";

const config = getConfig();

startServer({ port: config.port, corsOrigin: config.corsOrigin }).then((server) => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : config.port;
  console.log(`Miro Workflows API running at http://localhost:${port}`);
});

export { startServer } from "./bootstrap.js";
