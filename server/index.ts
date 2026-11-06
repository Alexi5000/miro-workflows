import { startServer } from "./bootstrap.js";
import { getConfig, legacyOAuthEnvWarnings } from "./config.js";

const config = getConfig();
for (const warning of legacyOAuthEnvWarnings()) console.warn(`[config] ${warning}`);

startServer({ port: config.port, corsOrigin: config.corsOrigin }).then((server) => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : config.port;
  console.log(`Miro Workflows API running at http://localhost:${port}`);
});

export { startServer } from "./bootstrap.js";
