import { fetchProfile } from "@/lib/data";
import FollowersModal from "@/components/FollowersModal";
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const username = params.username;
  const profile = await fetchProfile(username);
  
  if (!profile) {
    return {
      title: "User not found • Social Land",
    };
  }
  
  return {
    title: `${profile.username}'s followers • Social Land`,
  };
}

export default async function FollowersPage({ params }: Props) {
  const username = params.username;
  const profile = await fetchProfile(username);

  if (!profile) {
    notFound();
  }

  const followers = profile.followers || [];

  console.log("[FOLLOWERS_PAGE] Profile data:", {
    username: profile.username,
    followersCount: followers.length,
    followers: followers.map(f => ({
      id: f.id,
      username: f.username
    }))
  });

  return (
    <div className="h-full flex items-center justify-center">
      <FollowersModal 
        followers={followers} 
        username={username}
        isPrivate={profile.isPrivate}
        isFollowing={profile.isFollowing}
        onClose={() => {}}
      />
    </div>
  );
}
