import { create } from "zustand";

/** Superuser-only: lets that one account preview the app as a regular
 * player would see it, without actually losing GM access underneath (RLS
 * still grants it unconditionally — this is purely a display-layer
 * override consumed by useActiveCampaign). */
type ViewModeStore = {
  previewAsPlayer: boolean;
  togglePreviewAsPlayer: () => void;
};

export const useViewModeStore = create<ViewModeStore>((set) => ({
  previewAsPlayer: false,
  togglePreviewAsPlayer: () => set((s) => ({ previewAsPlayer: !s.previewAsPlayer })),
}));
