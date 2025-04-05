import { auth } from "@/lib/auth";
import { fetchProfile } from "@/lib/data";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import EditProfileContent from "@/components/EditProfileContent";

export const metadata: Metadata = {
  title: "Edit profile • Instagram",
  description: "Edit your Instagram profile",
};

async function EditProfile() {
  const session = await auth();
  if (!session?.user?.username) {
    redirect("/login");
  }

  const profile = await fetchProfile(session.user.username);
  if (!profile) {
    notFound();
  }

  return <EditProfileContent profile={profile} />;
}

export default EditProfile;
