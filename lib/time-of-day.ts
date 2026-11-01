export type PartOfDay = "morning" | "afternoon" | "evening" | "night";

/** Part of the day from the viewer's local clock. One set of cutoffs for the greeting and the room. */
export function partOfDay(date: Date): PartOfDay {
  const h = date.getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
}
