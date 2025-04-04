import { create } from "zustand";

interface StoryUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

interface StoryView {
  id: string;
  user: StoryUser;
  createdAt: Date;
}

interface StoryLike {
  id: string;
  user: StoryUser;
  createdAt: Date;
}

interface Story {
  id: string;
  createdAt: Date;
  fileUrl: string;
  scale: number;
  user: StoryUser;
  likes: StoryLike[];
  views: StoryView[];
}

interface UserStoriesState {
  userId: string;
  stories: Story[];
}

interface StoryModalStore {
  isOpen: boolean;
  userId: string | null;
  userStories: UserStoriesState[];
  currentUserIndex: number;
  onOpen: () => void;
  onClose: () => void;
  setUserId: (userId: string) => void;
  setUserStories: (stories: UserStoriesState[] | ((prev: UserStoriesState[]) => UserStoriesState[])) => void;
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
  setUserStories: (stories) => set((state) => ({
    userStories: typeof stories === 'function' ? stories(state.userStories) : stories
  })),
  setCurrentUserIndex: (index) => set({ currentUserIndex: index }),
})); 