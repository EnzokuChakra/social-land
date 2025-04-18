import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Language } from "@/lib/translations";
import { ChevronLeft } from "lucide-react";

interface LanguageToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function LanguageToggleModal({ isOpen, onClose, onBack }: LanguageToggleModalProps) {
  const { language, setLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);

  const handleLanguageChange = (lang: Language) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 py-3.5 px-3">
            <ChevronLeft 
              className="w-5 h-5 cursor-pointer" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.console.log('LanguageToggleModal Back Button Clicked');
                window.console.log('Current state:', {
                  isOpen,
                  selectedLanguage,
                  language
                });
                window.console.log('Calling onBack()');
                onBack();
                window.console.log('Calling onClose()');
                onClose();
                window.console.log('LanguageToggleModal Back Button Handlers Completed');
              }} 
            />
            <button 
              onClick={() => {
                window.console.log('Debug button clicked');
                window.console.log('Current state:', {
                  isOpen,
                  selectedLanguage,
                  language
                });
              }}
              className="ml-2 text-sm text-blue-500"
            >
              Debug
            </button>
            <p className="font-semibold ml-2">Language</p>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Button
            variant={selectedLanguage === "en" ? "default" : "outline"}
            onClick={() => handleLanguageChange("en")}
          >
            English
          </Button>
          <Button
            variant={selectedLanguage === "ro" ? "default" : "outline"}
            onClick={() => handleLanguageChange("ro")}
          >
            Română
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 