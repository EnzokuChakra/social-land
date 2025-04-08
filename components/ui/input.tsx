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
      console.log('[Input Debug] handleInput called', {
        value: target.value,
        selectionStart: target.selectionStart,
        selectionEnd: target.selectionEnd
      });

      const rect = target.getBoundingClientRect();
      console.log('[Input Debug] Input element rect:', {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });

      const position = target.selectionStart || 0;
      const textBeforeCaret = target.value.substring(0, position);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context) {
        const computedStyle = window.getComputedStyle(target);
        context.font = computedStyle.font;
        const textWidth = context.measureText(textBeforeCaret).width;
        console.log('[Input Debug] Text measurement:', {
          text: textBeforeCaret,
          font: computedStyle.font,
          measuredWidth: textWidth
        });
        setCaretPosition(textWidth);
      } else {
        console.warn('[Input Debug] Could not get canvas context');
      }

      // Call original onInput if it exists
      props.onInput?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      console.log('[Input Debug] Focus event:', {
        target: e.target.tagName,
        type: e.type,
        currentValue: e.target.value
      });
      
      e.target.focus();
      handleInput(e);
      props.onFocus?.(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
      console.log('[Input Debug] KeyUp event:', {
        key: e.key,
        currentValue: e.currentTarget.value
      });
      handleInput(e);
      props.onKeyUp?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      console.log('[Input Debug] Click event:', {
        clientX: e.clientX,
        clientY: e.clientY,
        currentValue: e.currentTarget.value
      });
      handleInput(e);
      props.onClick?.(e);
    };

    React.useEffect(() => {
      if (inputRef.current) {
        console.log('[Input Debug] Input mounted:', {
          type: inputRef.current.type,
          className: inputRef.current.className,
          computedStyle: window.getComputedStyle(inputRef.current)
        });

        // Check if pseudo-element is applied
        const afterStyle = window.getComputedStyle(inputRef.current, '::after');
        console.log('[Input Debug] Pseudo-element style:', {
          content: afterStyle.content,
          width: afterStyle.width,
          height: afterStyle.height,
          backgroundColor: afterStyle.backgroundColor,
          position: afterStyle.position
        });
      }
    }, []);

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
