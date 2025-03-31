"use client";

import { cn } from "@/lib/utils";
import ReactTimeago from "react-timeago";
import { useState, useEffect } from "react";

type Props = {
  createdAt: Date;
  className?: string;
  showFull?: boolean;
};

function Timestamp({ createdAt, className, showFull = false }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ReactTimeago
      className={cn(
        "font-medium text-neutral-500 dark:text-neutral-400",
        className
      )}
      date={createdAt}
      formatter={(value, unit) => {
        if (showFull) {
          // Convert to singular unit if value is 1
          const unitStr = value === 1 ? unit : unit + 's';
          return `${value} ${unitStr} ago`;
        } else {
          // Handle each time unit with short format
          if (value === 1) {
            return `1${unit[0]}`;
          }
          switch (unit) {
            case "second":
              return `${value}s`;
            case "minute":
              return `${value}m`;
            case "hour":
              return `${value}h`;
            case "day":
              return `${value}d`;
            case "week":
              return `${value}w`;
            case "month":
              return `${value}mo`;
            case "year":
              return `${value}y`;
            default:
              return `${value}${unit[0]}`;
          }
        }
      }}
    />
  );
}

export default Timestamp;
