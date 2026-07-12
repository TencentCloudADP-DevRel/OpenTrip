import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function loadWranglerConfig() {
  const path = fileURLToPath(
    new URL("../../../deploy/cloudflare/wrangler.api.jsonc", import.meta.url),
  );
  const source = readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(source) as {
    compatibility_date?: string;
    durable_objects?: { bindings?: Array<Record<string, unknown>> };
    migrations?: Array<Record<string, unknown>>;
  };
}

describe("Cloudflare realtime deployment config", () => {
  it("ships the Durable Object binding and SQLite migration", () => {
    const config = loadWranglerConfig();
    expect(config.compatibility_date).toBe("2026-04-07");
    expect(config.durable_objects?.bindings).toContainEqual({
      name: "TRIP_REALTIME",
      class_name: "TripRealtimeObject",
    });
    expect(config.migrations).toContainEqual({
      tag: "v1-trip-realtime",
      new_sqlite_classes: ["TripRealtimeObject"],
    });
  });
});
