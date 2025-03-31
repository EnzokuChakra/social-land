import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProfile } from "@/lib/data";
import FollowingModal from "@/components/FollowingModal";

interface Props {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await fetchProfile(params.username);

  if (!profile) {
    return {
      title: "User not found",
    };
  }

  return {
    title: `People followed by ${profile.username} • Social Land`,
  };
}

export default async function FollowingPage({ params }: Props) {
  const profile = await fetchProfile(params.username);

  if (!profile) {
    notFound();
  }

  const following = profile.following || [];

  console.log("Following page data:", {
    username: profile.username,
    followingCount: following.length,
    following: following.map(f => ({
      id: f.id,
      username: f.username,
      status: f.status
    }))
  });

  return (
    <FollowingModal
      following={following}
      username={profile.username ?? ''}
      isPrivate={profile.isPrivate}
      isFollowing={profile.isFollowing}
    />
  );
}
