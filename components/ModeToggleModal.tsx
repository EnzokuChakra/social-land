import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ChevronLeft } from "lucide-react";

interface ModeToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function ModeToggleModal({ isOpen, onClose, onBack }: ModeToggleModalProps) {
  const { theme, setTheme } = useTheme();
  const [selectedMode, setSelectedMode] = useState(theme);

  useEffect(() => {
    console.log('ModeToggleModal mounted/updated:', { isOpen, selectedMode, theme });
  }, [isOpen, selectedMode, theme]);

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode);
    setTheme(mode);
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('ModeToggleModal back button clicked');
    console.log('Current state:', { isOpen, selectedMode, theme });
    onBack();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 py-3.5 px-3">
            <button 
              onClick={handleBackClick}
              className="flex items-center"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="ml-2">Back</span>
            </button>
            <p className="font-semibold ml-2">Switch appearance</p>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Button
            variant={selectedMode === "light" ? "default" : "outline"}
            onClick={() => handleModeChange("light")}
          >
            Light Mode
          </Button>
          <Button
            variant={selectedMode === "dark" ? "default" : "outline"}
            onClick={() => handleModeChange("dark")}
          >
            Dark Mode
          </Button>
          <Button
            variant={selectedMode === "system" ? "default" : "outline"}
            onClick={() => handleModeChange("system")}
          >
            System
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 