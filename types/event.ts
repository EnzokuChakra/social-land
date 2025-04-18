import { User } from "@prisma/client";

export interface Event {
  id: string;
  name: string;
  description: string;
  rules: string | null;
  type: string;
  prizes: string[] | null;
  location: string;
  startDate: Date;
  photoUrl: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user?: User;
}

export interface EventWithUserData extends Event {
  user: User;
} 