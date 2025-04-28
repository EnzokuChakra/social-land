// Role types
export enum UserRole {
  USER = "USER",
  MODERATOR = "MODERATOR",
  ADMIN = "ADMIN",
  MASTER_ADMIN = "MASTER_ADMIN"
}

export type UserRoleType = "USER" | "MODERATOR" | "ADMIN" | "MASTER_ADMIN";
export type UserStatus = "NORMAL" | "BANNED";

// Base types from Prisma Schema
export type User = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  password: string | null;
  image: string | null;
  bio: string | null;
  verified: boolean;
  isPrivate: boolean;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  stories?: { id: string }[];
  hasActiveStory?: boolean;
  blockedBy?: Block[];
  blockedUsers?: Block[];
  isFollowing?: boolean;
};

export type Post = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  caption: string | null;
  location: string | null;
  fileUrl: string;
  aspectRatio: number;
  user_id: string;
};

export interface StoryUser {
  id: string;
  username: string | null;
  image: string | null;
}

export interface StoryView {
  id: string;
  user_id: string;
  storyId: string;
  createdAt: Date;
  user: StoryUser;
}

export interface StoryLike {
  id: string;
  user_id: string;
  storyId: string | null;
  createdAt: Date;
  updatedAt: Date;
  postId: string | null;
  reelId: string | null;
  user: StoryUser;
}

export interface Story {
  id: string;
  user_id: string;
  fileUrl: string;
  createdAt: Date;
  scale: number;
  views?: StoryView[];  // Optional since they may not be available during creation
  likes?: StoryLike[];  // Optional since they may not be available during creation
}

export type Like = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  postId: string | null;
  reelId: string | null;
  storyId: string | null;
  user_id: string;
};

export type Comment = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  body: string;
  postId: string | null;
  reelId: string | null;
  user_id: string;
};

export type Follows = {
  followerId: string;
  followingId: string;
  status: "PENDING" | "ACCEPTED";
  createdAt: Date;
};

export type SavedPost = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  user_id: string;
  post_id: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: string;
    status: string;
  };
};

export type NotificationType = 
  | "FOLLOW" 
  | "LIKE" 
  | "COMMENT" 
  | "FOLLOW_REQUEST" 
  | "REPLY" 
  | "MENTION" 
  | "TAG"
  | "STORY_LIKE"
  | "COMMENT_LIKE"
  | "EVENT_CREATED";

export type Notification = {
  id: string;
  type: NotificationType;
  createdAt: Date;
  userId: string;
  sender_id: string;
  postId: string | null;
  isRead: boolean;
  reelId: string | null;
  storyId: string | null;
  metadata: Record<string, any> | null;
};

export type Reel = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  caption: string | null;
  fileUrl: string;
  thumbnail: string;
  views: number;
  user_id: string;
};

// Extended types with relations
export type UserWithFollows = User & {
  followers: {
    follower: {
      id: string;
      username: string;
      name: string;
      image: string | null;
      verified: boolean;
      isPrivate: boolean;
      isFollowing: boolean;
      hasPendingRequest: boolean;
    };
  }[];
  following: {
    following: {
      id: string;
      username: string;
      name: string;
      image: string | null;
      verified: boolean;
      isPrivate: boolean;
      isFollowing: boolean;
      hasPendingRequest: boolean;
    };
  }[];
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  hasPendingRequest: boolean;
};

export type UserWithExtras = User & {
  role: UserRole;
  status: UserStatus;
  followers: FollowerWithExtras[];
  following: FollowingWithExtras[];
  posts: PostWithExtras[];
  savedPosts: SavedPostWithExtras[];
  stories: StoryWithExtras[];
  postTags: (PostTag & { post: PostWithExtras })[];
  followersCount: number;
  followingCount: number;
  hasActiveStory: boolean;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  isFollowedByUser: boolean;
  hasPendingRequestFromUser: boolean;
};

export type PostWithExtras = Post & {
  _count?: {
    likes: number;
    comments: number;
  };
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: string;
    status: string;
    isFollowing?: boolean;
    hasPendingRequest?: boolean;
    isFollowedByUser?: boolean;
    hasActiveStory?: boolean;
    stories?: {
      id: string;
      createdAt: Date;
    }[];
  };
  likes: (Like & { 
    user: {
      id: string;
      username: string | null;
      name: string | null;
      image: string | null;
      verified: boolean;
      isPrivate: boolean;
      role: string;
      status: string;
      isFollowing?: boolean;
      hasPendingRequest?: boolean;
    }
  })[];
  savedBy: (SavedPost & { 
    user: {
      id: string;
      username: string | null;
      name: string | null;
      image: string | null;
      verified: boolean;
      isPrivate: boolean;
      role: string;
      status: string;
    }
  })[];
  comments: CommentWithExtras[];
  tags: PostTag[];
};

export type StoryWithExtras = Story & {
  user: User;
  likes: (Like & { user: User })[];
  views: (StoryView & { user: User })[];
};

export type ReelWithExtras = Reel & {
  user: User;
  likes: (Like & { user: User })[];
  comments: (Comment & { user: User })[];
};

export type CommentWithExtras = Comment & {
  user: User & {
    isFollowing?: boolean;
    isPrivate?: boolean;
    hasPendingRequest?: boolean;
    isFollowedByUser?: boolean;
    hasActiveStory?: boolean;
  };
  likes: CommentLike[];
  replies?: CommentWithExtras[];
  parentId: string | null;
};

export type CommentLike = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  commentId: string;
  user_id: string;
  user: User;
};

export type CommentLikeWithExtras = CommentLike & {
  user: User;
  comment?: Comment;
};

export type LikeWithExtras = Like & {
  user: User;
  post?: Post;
  reel?: Reel;
  story?: Story;
};

export type SavedPostWithExtras = SavedPost & {
  post: PostWithExtras | null;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: string;
    status: string;
  };
};

export interface NotificationWithExtras extends Omit<Notification, 'metadata'> {
  sender?: UserWithExtras;
  metadata?: any;
  read: boolean;
}

export type FollowerWithExtras = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  verified: boolean;
  isPrivate: boolean;
  role: string;
  status: string;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  isFollowedByUser: boolean;
  hasActiveStory: boolean;
  followerId: string;
  followingId: string;
  uniqueId: string;
  createdAt?: Date;
  follower: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: string;
    status: string;
  };
};

export type FollowingWithExtras = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  verified: boolean;
  isPrivate: boolean;
  role: string;
  status: string;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  isFollowedByUser: boolean;
  hasActiveStory: boolean;
  followerId: string;
  followingId: string;
  uniqueId: string;
  createdAt?: Date;
  following: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: string;
    status: string;
  };
};

export type Report = {
  id: string;
  createdAt: string;
  postId: string;
  userId: string;
  reason: string | null;
  status: "PENDING" | "REVIEWED" | "DISMISSED";
  user: {
    id: string;
    username: string | null;
    image: string | null;
  };
  post: {
    id: string;
    fileUrl: string;
  };
};

// API Response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Form types
export type LoginFormData = {
  email: string;
  password: string;
};

export type RegisterFormData = {
  email: string;
  username: string;
  password: string;
  name?: string;
};

export type ProfileFormData = {
  name?: string;
  username?: string;
  bio?: string;
  image?: string;
  isPrivate?: boolean;
};

export type PostTag = {
  id: string;
  postId: string;
  userId: string;
  x?: number | null;
  y?: number | null;
  createdAt: Date;
  user: User;
};

export type UserAvatarUser = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  verified?: boolean;
  isPrivate?: boolean;
  isFollowing?: boolean;
  hasActiveStory?: boolean;
};

export type NotificationWithUser = NotificationWithExtras;

export type Event = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description: string;
  rules: string | null;
  type: string;
  prize: string | null;
  prizes: string | null;
  location: string;
  startDate: Date;
  photoUrl: string;
  user_id: string;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
};

export type EventWithUser = Event & {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    role: UserRole;
    status: UserStatus;
  };
  prize: string | null;
  prizes: string | null;
  _count?: {
    interested: number;
    participants: number;
  };
};

export type EventWithUserData = {
  id: string;
  name: string;
  description: string;
  rules: string | null;
  type: string;
  prize: string | null;
  location: string;
  startDate: Date;
  photoUrl: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user: User;
};

export type EventStatus = "UPCOMING" | "ONGOING" | "ENDED";

export type FollowStatus = "PENDING" | "ACCEPTED" | "UNFOLLOWED" | "DELETED";

export type FollowAction = "follow" | "unfollow" | "accept" | "delete";

export type FollowResponse = {
  status: FollowStatus;
  message?: string;
  error?: string;
  errors?: { message: string }[];
};

export type FollowState = {
  isFollowing: boolean;
  hasPendingRequest: boolean;
  isFollowedByUser: boolean;
};

export type EventUserData = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  verified: boolean;
};

export type Block = {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
};
