import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface Transaction {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
}
export interface Store {
  kind: "local" | "firestore";
  transaction<T>(run: (tx: Transaction) => Promise<T>): Promise<T>;
}
const copy = <T>(value: T): T => structuredClone(value);
const expiry = (value: unknown) => {
  const record = value as
    { expiresAt?: number; isDemo?: boolean; createdAt?: string } | undefined;
  return typeof record?.expiresAt === "number"
    ? record.expiresAt
    : record?.isDemo && record.createdAt
      ? Date.parse(record.createdAt) + 86400000
      : undefined;
};

/** Single-process development adapter. Every successful transaction is an atomic file rename. */
export class LocalStore implements Store {
  kind = "local" as const;
  private queue: Promise<unknown> = Promise.resolve();
  private state: Record<string, unknown> | undefined;
  constructor(private file: string | undefined) {}
  transaction<T>(run: (tx: Transaction) => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      if (!this.state) {
        try {
          this.state = this.file
            ? (JSON.parse(await fs.readFile(this.file, "utf8")) as Record<
                string,
                unknown
              >)
            : {};
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          this.state = {};
        }
      }
      const writes = new Map<string, unknown>();
      const deleted = new Set<string>();
      for (const [key, value] of Object.entries(this.state)) {
        const expiresAt = expiry(value);
        if (expiresAt && expiresAt <= Date.now()) deleted.add(key);
      }
      const tx: Transaction = {
        get: async <T>(key: string) =>
          copy(
            (deleted.has(key)
              ? undefined
              : writes.has(key)
                ? writes.get(key)
                : this.state![key]) as T | undefined,
          ),
        set: (key, value) => {
          writes.set(key, copy(value));
          deleted.delete(key);
        },
        delete: (key) => {
          writes.delete(key);
          deleted.add(key);
        },
      };
      const value = await run(tx);
      if (writes.size || deleted.size) {
        const next = { ...this.state };
        for (const key of deleted) delete next[key];
        for (const [key, v] of writes) next[key] = v;
        if (this.file) {
          await fs.mkdir(path.dirname(this.file), {
            recursive: true,
            mode: 0o700,
          });
          const temporary = `${this.file}.${randomUUID()}.tmp`;
          try {
            await fs.writeFile(temporary, JSON.stringify(next), {
              mode: 0o600,
            });
            await fs.rename(temporary, this.file);
          } finally {
            await fs.rm(temporary, { force: true });
          }
        }
        this.state = next;
      }
      return value;
    });
    this.queue = result.catch(() => {});
    return result;
  }
}

/** Each tenant is one bounded aggregate. Firestore retries conflicting transactions. */
export async function createFirestoreStore(projectId?: string): Promise<Store> {
  const { Firestore } = await import("@google-cloud/firestore");
  const db = new Firestore({
    projectId,
    databaseId: process.env.FIRESTORE_DATABASE_ID ?? "(default)",
    ignoreUndefinedProperties: true,
  });
  return {
    kind: "firestore",
    transaction: (run) =>
      db.runTransaction(async (native) => {
        const writes = new Map<string, unknown>();
        const deleted = new Set<string>();
        const reference = (key: string) =>
          db
            .collection("pactshift")
            .doc(Buffer.from(key).toString("base64url"));
        const tx: Transaction = {
          get: async <T>(key: string) => {
            if (deleted.has(key)) return undefined;
            if (writes.has(key)) return copy(writes.get(key) as T);
            return (await native.get(reference(key))).data()?.value as
              T | undefined;
          },
          set: (key, value) => {
            writes.set(key, copy(value));
            deleted.delete(key);
          },
          delete: (key) => {
            writes.delete(key);
            deleted.add(key);
          },
        };
        const result = await run(tx);
        for (const key of deleted) native.delete(reference(key));
        for (const [key, value] of writes) {
          const expiresAt = expiry(value);
          native.set(reference(key), {
            value,
            ...(typeof expiresAt === "number"
              ? { expiresAt: new Date(expiresAt) }
              : {}),
          });
        }
        return result;
      }),
  };
}
