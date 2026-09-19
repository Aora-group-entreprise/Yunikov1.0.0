import { toggleLike, toggleSave } from "./service";

export type PendingInteraction = {
  kind: "like" | "save";
  postId: number;
  desired: boolean;
  collectionId?: number;
};

const KEY = "yuniko-interaction-queue";
const timers = new Map<string, number>();

function readQueue(): PendingInteraction[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function writeQueue(items: PendingInteraction[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
function idOf(item: PendingInteraction) { return item.kind + ":" + item.postId; }

export function enqueueInteraction(item: PendingInteraction) {
  const key = idOf(item);
  const next = readQueue().filter(existing => idOf(existing) !== key);
  next.push(item);
  writeQueue(next);
  const old = timers.get(key);
  if (old) window.clearTimeout(old);
  timers.set(key, window.setTimeout(() => { timers.delete(key); void flushInteractionQueue(); }, 600));
}

export async function flushInteractionQueue() {
  if (!navigator.onLine) return;
  const items = readQueue();
  if (!items.length) return;
  const remaining: PendingInteraction[] = [];
  for (const item of items) {
    try {
      const result = item.kind === "like"
        ? await toggleLike(item.postId, item.desired)
        : await toggleSave(item.postId, item.desired, item.collectionId);
      if (result.error) remaining.push(item);
    } catch { remaining.push(item); }
  }
  writeQueue(remaining);
}
