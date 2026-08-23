import { buildApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";
import { createSocketServer } from "./realtime/socketServer.js";

async function main() {
  runMigrations();

  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });

  createSocketServer(app.server);
  app.log.info(`whist-game listening on :${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
