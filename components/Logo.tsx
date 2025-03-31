"use client";

import Link from "next/link";
import { buttonVariants } from "./ui/button";

function Logo() {
  return (
    <Link href={"/dashboard"} className="hidden md:block">
      <div className={buttonVariants({ variant: "ghost", className: "font-semibold text-xl px-4" })}>
        Social Land
      </div>
    </Link>
  );
}

export default Logo;
