import { create } from 'zustand';

export type ChecklistAnswer = 'ok' | 'not_ok' | 'na';

export const EMPTY_ANSWERS: Record<string, ChecklistAnswer> = {};

/** Checklist answers of inspections in progress (sent with POST /inspections/{id}/submit). */
interface InspectionDraftState {
  answers: Record<string, Record<string, ChecklistAnswer>>;
  setAnswer: (inspectionId: string, itemId: string, answer: ChecklistAnswer) => void;
  clear: (inspectionId: string) => void;
}

export const useInspectionDraftStore = create<InspectionDraftState>((set) => ({
  answers: {},
  setAnswer: (inspectionId, itemId, answer) =>
    set((s) => ({
      answers: { ...s.answers, [inspectionId]: { ...(s.answers[inspectionId] || {}), [itemId]: answer } },
    })),
  clear: (inspectionId) =>
    set((s) => {
      const next = { ...s.answers };
      delete next[inspectionId];
      return { answers: next };
    }),
}));
