"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReportStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  username: string;
}

export default function ReportStoryModal({ isOpen, onClose, storyId, username }: ReportStoryModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for reporting");
      return;
    }

    if (reason.length > 100) {
      toast.error("Reason must be 100 characters or less");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reports/story/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyId,
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success("Story reported successfully");
      setReason("");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to report story");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Story by @{username}</DialogTitle>
          <DialogDescription>
            Please provide a reason for reporting this story. This will help our moderators review the report.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-4">
          <Input
            placeholder="Enter reason (max 100 characters)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={100}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Report Story"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 