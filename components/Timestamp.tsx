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
    <span className={cn(
      "font-medium text-neutral-500 dark:text-neutral-400",
      className
    )}>
      <ReactTimeago
        date={createdAt}
        formatter={(value, unit) => {
          if (showFull) {
            // Convert to singular unit if value is 1
            const unitStr = value === 1 ? unit : unit + 's';
            return `${value} ${unitStr} ago`;
          } else {
            // Handle each time unit with exact format
            switch (unit) {
              case "second":
                return value === 1 ? "1s" : `${value}s`;
              case "minute":
                return value === 1 ? "1m" : `${value}m`;
              case "hour":
                return value === 1 ? "1h" : `${value}h`;
              case "day":
                return value === 1 ? "1d" : `${value}d`;
              case "week":
                return value === 1 ? "1w" : `${value}w`;
              case "month":
                return value === 1 ? "1mo" : `${value}mo`;
              case "year":
                return value === 1 ? "1y" : `${value}y`;
              default:
                return `${value}${unit[0]}`;
            }
          }
        }}
      />
    </span>
  );
}

export default Timestamp;
