"use client";

import Link from "next/link";
import { Button } from "./ui/button";

function Header() {
  return (
    <header className="fixed md:hidden bg-white top-0 flex items-center dark:bg-black w-full z-50 border-b border-zinc-300 dark:border-neutral-700 px-3 py-2 sm:-ml-6">
      <Link href={"/dashboard"}>
        <Button
          variant={"ghost"}
          className="font-semibold text-xl"
        >
          OG Gram
        </Button>
      </Link>
    </header>
  );
}

export default Header;
