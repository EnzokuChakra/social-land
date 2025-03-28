import { cn } from "@/lib/utils";

interface CustomLoaderProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  noPadding?: boolean;
}

export function CustomLoader({ className = "", size = "default", noPadding = false }: CustomLoaderProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    default: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className={cn(
      "flex items-center justify-center w-full h-full",
      !noPadding && "pl-[88px]",
      className
    )}>
      <div className={cn(
        "animate-spin rounded-full border-b-2 border-white",
        sizeClasses[size]
      )} />
    </div>
  );
} 