"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";

export default function BackButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-2"
      onClick={() => window.history.back()}
    >
      <ChevronLeft className="w-5 h-5" />
      <span>Back</span>
    </Button>
  );
} 