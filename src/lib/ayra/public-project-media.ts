import type { AyraState, InitiativeMedia } from "@/lib/ayra/domain";

export function initiativeMediaFor(state: AyraState, initiativeId: string) {
  const media = (state.initiativeMedia ?? [])
    .filter((item) => item.initiativeId === initiativeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    main: media.find((item) => item.role === "main"),
    gallery: media.filter((item) => item.role === "gallery"),
  } satisfies { main?: InitiativeMedia; gallery: InitiativeMedia[] };
}
