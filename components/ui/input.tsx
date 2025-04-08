import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [caretPosition, setCaretPosition] = React.useState<number>(0);

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      const rect = target.getBoundingClientRect();
      const position = target.selectionStart || 0;
      const textBeforeCaret = target.value.substring(0, position);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        const computedStyle = window.getComputedStyle(target);
        context.font = computedStyle.font;
        const textWidth = context.measureText(textBeforeCaret).width;
        setCaretPosition(textWidth);
      }
      // Call original onInput if it exists
      props.onInput?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.focus();
      handleInput(e);
      props.onFocus?.(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
      handleInput(e);
      props.onKeyUp?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      handleInput(e);
      props.onClick?.(e);
    };

    React.useImperativeHandle(ref, () => inputRef.current!);

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "custom-caret",
            className
          )}
          ref={inputRef}
          onInput={handleInput}
          onFocus={handleFocus}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          {...props}
        />
        <style jsx>{`
          .custom-caret::after {
            left: ${3 + caretPosition}px !important;
            right: auto !important;
          }
        `}</style>
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
