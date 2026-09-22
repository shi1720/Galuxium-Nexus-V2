import path from "node:path";
import { createApp } from "./app.js";
import { createFirestoreStore, LocalStore } from "./store.js";

const production = process.env.NODE_ENV === "production";
if (production && !process.env.APP_ORIGIN)
  throw new Error("APP_ORIGIN is required in production.");
if (production && process.env.DATA_BACKEND !== "firestore")
  throw new Error(
    "Production requires DATA_BACKEND=firestore; local JSON is a single-process development adapter.",
  );
if (production && !(process.env.APP_ORIGIN ?? "").startsWith("https://"))
  throw new Error("Production APP_ORIGIN must use HTTPS.");
const store =
  process.env.DATA_BACKEND === "firestore"
    ? await createFirestoreStore(process.env.GOOGLE_CLOUD_PROJECT)
    : new LocalStore(
        path.resolve(process.env.DATA_FILE ?? ".data/pactshift.json"),
      );
const app = createApp(store);
const server = app.listen(Number(process.env.PORT ?? 8080), "0.0.0.0", () =>
  console.log(
    `Pactshift API listening on port ${process.env.PORT ?? 8080}; ${store.kind} persistence`,
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
