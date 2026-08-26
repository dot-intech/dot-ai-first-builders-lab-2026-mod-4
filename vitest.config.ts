import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: fileURLToPath(new URL("./.env.local", import.meta.url)) });

const alias = {
  "@": fileURLToPath(new URL(".", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    // Los tests de integration/contract comparten una única base Postgres
    // real (ver research.md §10) — deben correr secuencialmente, nunca en
    // paralelo entre archivos ni entre proyectos, para no pisarse los datos.
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "contract",
          environment: "node",
          include: ["tests/contract/**/*.test.ts"],
        },
      },
    ],
  },
});
