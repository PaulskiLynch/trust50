import { defineConfig } from "prisma/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filename: string, override = false) {
  const filepath = path.join(process.cwd(), filename);
  if (!existsSync(filepath)) {
    return;
  }

  const contents = readFileSync(filepath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && (override || !process.env[key])) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local", true);

export default defineConfig({
  schema: "prisma/schema.prisma",
});
