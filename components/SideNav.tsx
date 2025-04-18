import { auth } from "@/lib/auth";
import Logo from "./Logo";
import MoreDropdown from "./MoreDropdown";
import NavLinks from "./NavLinks";
import ProfileLink from "./ProfileLink";

async function SideNav() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2">
      <div className="fixed inset-x-0 bottom-0 md:relative md:inset-auto flex h-16 md:h-full w-full flex-row md:flex-col justify-between bg-white dark:bg-black md:border-r border-t md:border-t-0 border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-1 flex-row md:flex-col">
          {/* Top section with logo */}
          <div className="hidden md:flex px-2 pt-4 pb-4">
            <Logo />
          </div>

          {/* Mobile logo */}
          <div className="flex md:hidden">
            <div className="p-2">
              <Logo />
            </div>
          </div>

          {/* Navigation section */}
          <div className="flex flex-1 flex-row md:flex-col justify-around md:justify-start md:space-y-1 px-2">
            <NavLinks />
          </div>

          {/* Profile link */}
          {user && (
            <div className="flex items-center md:px-2">
              <ProfileLink user={user} />
            </div>
          )}
        </div>

        {/* More dropdown - fixed to bottom */}
        <div className="hidden md:flex md:px-2 md:pb-4">
          <MoreDropdown />
        </div>
      </div>
    </div>
  );
}

export default SideNav;

