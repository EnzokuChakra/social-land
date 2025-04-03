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

export type Story = {
  id: string;
  createdAt: Date;
  fileUrl: string;
  scale: number;
  user_id: string;
};

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
  postId: string;
  user_id: string;
};

export type NotificationType = 
  | "LIKE" 
  | "COMMENT" 
  | "FOLLOW" 
  | "FOLLOW_REQUEST" 
  | "REPLY" 
  | "MENTION" 
  | "TAG";

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

export type StoryView = {
  id: string;
  createdAt: Date;
  storyId: string;
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
  posts: PostWithExtras[];
  savedPosts: SavedPostWithExtras[];
  followers: FollowerWithExtras[];
  following: FollowingWithExtras[];
  stories: StoryWithExtras[];
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
  isFollowedByUser?: boolean;
  followStatus?: "PENDING" | "ACCEPTED" | null;
};

export type PostWithExtras = Post & {
  user: User & {
    isFollowing?: boolean;
    isPrivate?: boolean;
    hasPendingRequest?: boolean;
    isFollowedByUser?: boolean;
    hasActiveStory?: boolean;
  };
  likes: (Like & { user: User })[];
  savedBy: (SavedPost & { user: User })[];
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
  post: Post;
  user: User;
};

export type NotificationWithExtras = Notification & {
  user_id?: string; // For backward compatibility
  sender?: {
    id: string;
    username: string | null;
    image: string | null;
    isFollowing?: boolean;
    hasPendingRequest?: boolean;
    isFollowedByUser?: boolean;
    isPrivate?: boolean;
  };
  post?: {
    id: string;
    fileUrl: string;
  } | null;
  comment?: {
    id: string;
    text: string;
  } | null;
  metadata?: Record<string, any> | null;
};

export type FollowerWithExtras = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  verified: boolean;
  isPrivate: boolean;
  followerId: string;
  followingId: string;
  status: "ACCEPTED" | "PENDING";
  isFollowing: boolean;
  hasPendingRequest: boolean;
  uniqueId: string;
  follower: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    isFollowing: boolean;
    hasPendingRequest: boolean;
  };
};

export type FollowingWithExtras = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  verified: boolean;
  isPrivate: boolean;
  followerId: string;
  followingId: string;
  status: "ACCEPTED" | "PENDING";
  isFollowing: boolean;
  hasPendingRequest: boolean;
  uniqueId: string;
  following: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    isFollowing: boolean;
    hasPendingRequest: boolean;
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
  prizes: string[] | null;
  location: string;
  startDate: Date;
  photoUrl: string;
  user_id: string;
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
};

export type EventWithUserData = {
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
