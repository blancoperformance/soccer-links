import type { LinkItem } from "@/features/public/content";

export type ItemStatus = "visible" | "hidden" | "scheduled" | "expired" | "no-url" | "no-quiz";

export function itemStatus(item: LinkItem, now: Date = new Date(), quizReady = false): ItemStatus {
  if (!item.visible) return "hidden";
  if (item.startsAt && new Date(item.startsAt) > now) return "scheduled";
  if (item.endsAt && new Date(item.endsAt) <= now) return "expired";
  if (item.type === "quiz" && !quizReady) return "no-quiz";
  if ((item.type === "link" || item.type === "feature") && !item.url?.trim()) return "no-url";
  return "visible";
}

export const isPubliclyVisible = (item: LinkItem, now?: Date, quizReady?: boolean) =>
  itemStatus(item, now, quizReady) === "visible";
