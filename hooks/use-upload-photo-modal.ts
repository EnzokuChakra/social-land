"use client";

import { create } from "zustand";

interface UploadPhotoModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useUploadPhotoModal = create<UploadPhotoModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
})); 