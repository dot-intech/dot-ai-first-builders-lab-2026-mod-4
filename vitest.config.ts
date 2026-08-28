import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Base de datos dedicada a tests (puerto 5434, ver docker-compose.yml) —
// nunca la de `npm run dev` (.env.local, puerto 5433). Los tests de
// integration/contract vacían las tablas en cada corrida.
loadEnv({ path: fileURLToPath(new URL("./.env.test", import.meta.url)) });

const alias = {
  "@": fileURLToPath(new URL(".", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    // Los tests de integration/contract comparten una única base Postgres
    // de test — deben correr secuencialmente, nunca en paralelo entre
    // archivos ni entre proyectos, para no pisarse los datos.
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
