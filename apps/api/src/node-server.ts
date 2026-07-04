import { serve } from "@hono/node-server";
import { createContainer } from "./infrastructure/composition/container";
import { createApp } from "./interfaces/http/app";

const container = createContainer(process.env);
const app = createApp(container);
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});
