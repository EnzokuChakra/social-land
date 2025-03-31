import { create } from "zustand";

interface StoryModalStore {
  isOpen: boolean;
  userId: string | null;
  userStories: { userId: string; stories: any[] }[];
  currentUserIndex: number;
  onOpen: () => void;
  onClose: () => void;
  setUserId: (userId: string) => void;
  setUserStories: (stories: { userId: string; stories: any[] }[]) => void;
  setCurrentUserIndex: (index: number) => void;
}

export const useStoryModal = create<StoryModalStore>((set) => ({
  isOpen: false,
  userId: null,
  userStories: [],
  currentUserIndex: 0,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false, userId: null, userStories: [], currentUserIndex: 0 }),
  setUserId: (userId: string) => set({ userId }),
  setUserStories: (stories) => set({ userStories: stories }),
  setCurrentUserIndex: (index) => set({ currentUserIndex: index }),
})); 