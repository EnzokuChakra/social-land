export const translations = {
  en: {
    common: {
      more: "More",
      editProfile: "Edit profile",
      yourActivity: "Your activity",
      saved: "Saved",
      switchAppearance: "Switch appearance",
      report: "Report",
      logout: "Log out",
      language: "Language",
    },
    auth: {
      login: "Log in",
      signup: "Sign up",
      email: "Email",
      password: "Password",
      forgotPassword: "Forgot password?",
    },
    post: {
      like: "Like",
      comment: "Comment",
      share: "Share",
      save: "Save",
      delete: "Delete",
      deleteConfirm: "Are you sure you want to delete this post?",
    },
    profile: {
      posts: "Posts",
      followers: "Followers",
      following: "Following",
      editProfile: "Edit Profile",
      follow: "Follow",
      unfollow: "Unfollow",
    },
    activity: {
      title: "Your Activity",
      subtitle: "Track your interactions across posts and content",
      likes: "Likes",
      comments: "Comments",
      saved: "Saved",
      noLikes: "No likes yet",
      noComments: "No comments yet",
      noSaved: "No saved posts yet",
      likedPost: "You liked a post by",
      commentedPost: "You commented on",
      savedPost: "You saved a post by",
    },
  },
  ro: {
    common: {
      more: "Mai mult",
      editProfile: "Editează profilul",
      yourActivity: "Activitatea ta",
      saved: "Salvate",
      switchAppearance: "Schimbă aspectul",
      report: "Raportează",
      logout: "Deconectare",
      language: "Limbă",
    },
    auth: {
      login: "Conectare",
      signup: "Înregistrare",
      email: "Email",
      password: "Parolă",
      forgotPassword: "Ai uitat parola?",
    },
    post: {
      like: "Apreciază",
      comment: "Comentează",
      share: "Distribuie",
      save: "Salvează",
      delete: "Șterge",
      deleteConfirm: "Ești sigur că vrei să ștergi această postare?",
    },
    profile: {
      posts: "Postări",
      followers: "Urmăritori",
      following: "Urmărește",
      editProfile: "Editează Profilul",
      follow: "Urmărește",
      unfollow: "Nu mai urmări",
    },
    activity: {
      title: "Activitatea Ta",
      subtitle: "Urmărește interacțiunile tale cu postările și conținutul",
      likes: "Aprecieri",
      comments: "Comentarii",
      saved: "Salvate",
      noLikes: "Nicio apreciere încă",
      noComments: "Niciun comentariu încă",
      noSaved: "Nicio postare salvată încă",
      likedPost: "Ai apreciat o postare de la",
      commentedPost: "Ai comentat la postarea lui",
      savedPost: "Ai salvat o postare de la",
    },
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export function getTranslation(language: Language, key: string) {
  const keys = key.split(".");
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return key; // Return the key if translation is not found
    }
  }
  
  return value as string;
} 