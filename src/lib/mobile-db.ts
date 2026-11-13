const databaseName = "securelog-mobile";
const databaseVersion = 1;
const stores = ["auth", "catalog", "pending"] as const;
type StoreName = (typeof stores)[number];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      for (const store of stores) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir o banco local"));
  });
}

async function read<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function write<T>(store: StoreName, key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readwrite").objectStore(store).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type CachedUser = { id: string; username: string; name: string; role: "admin" | "supervisor" | "operator" | "viewer" };
export async function cacheUser(username: string, password: string, user: CachedUser): Promise<void> {
  await write("auth", username.trim().toLowerCase(), { user, passwordHash: await hashPassword(password) });
}
export async function getCachedUser(username: string, password: string): Promise<CachedUser | null> {
  const cached = await read<{ user: CachedUser; passwordHash: string }>("auth", username.trim().toLowerCase());
  if (!cached || cached.passwordHash !== await hashPassword(password)) return null;
  return cached.user;
}

export type MobileCatalog = { locations: unknown[]; devices: unknown[]; savedAt: string };
export const saveCatalog = (catalog: Omit<MobileCatalog, "savedAt">) => write("catalog", "current", { ...catalog, savedAt: new Date().toISOString() });
export const getCatalog = () => read<MobileCatalog>("catalog", "current");

export type PendingRecord = { id: string; codigo: string; data: string; locationId: string; tentativas: number; status: "aguardando" | "enviando" | "erro" };
export const savePendingRecords = (records: PendingRecord[]) => write("pending", "readings", records);
export const getPendingRecords = () => read<PendingRecord[]>("pending", "readings");
