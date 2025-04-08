import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const caretRef = React.useRef<HTMLDivElement>(null);
    const [caretPosition, setCaretPosition] = React.useState<number>(0);
    const [isFocused, setIsFocused] = React.useState(false);

    const updateCaretPosition = (target: HTMLInputElement) => {
      try {
        const position = target.selectionStart || 0;
        const textBeforeCaret = target.value.substring(0, position);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        console.log('Debug - Text info:', JSON.stringify({
          fullText: target.value,
          beforeCaret: textBeforeCaret,
          position: position
        }));

        if (context && caretRef.current) {
          const computedStyle = window.getComputedStyle(target);
          context.font = computedStyle.font;
          const textWidth = context.measureText(textBeforeCaret).width;
          
          console.log('Debug - Measurements:', JSON.stringify({
            font: computedStyle.font,
            textWidth: textWidth,
            inputPadding: computedStyle.paddingLeft
          }));

          // Position the caret
          const padding = parseInt(computedStyle.paddingLeft || '0');
          caretRef.current.style.left = `${padding + textWidth}px`;
          caretRef.current.style.top = '50%';
          caretRef.current.style.transform = 'translateY(-50%)';
          
          console.log('Debug - Caret element:', JSON.stringify({
            left: caretRef.current.style.left,
            top: caretRef.current.style.top,
            visibility: caretRef.current.style.visibility
          }));
        }
      } catch (error) {
        console.error('Debug - Error updating caret:', error);
      }
    };

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      updateCaretPosition(target);
      props.onInput?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      console.log('Debug - Focus event:', JSON.stringify({
        type: e.type,
        value: e.target.value
      }));
      setIsFocused(true);
      updateCaretPosition(e.target);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
      console.log('Debug - KeyUp event:', JSON.stringify({
        key: e.key,
        value: e.currentTarget.value
      }));
      updateCaretPosition(e.currentTarget);
      props.onKeyUp?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      console.log('Debug - Click event:', JSON.stringify({
        x: e.clientX,
        y: e.clientY,
        value: e.currentTarget.value
      }));
      updateCaretPosition(e.currentTarget);
      props.onClick?.(e);
    };

    React.useEffect(() => {
      if (inputRef.current) {
        console.log('Debug - Input mounted:', JSON.stringify({
          type: inputRef.current.type,
          className: inputRef.current.className
        }));
      }
    }, []);

    React.useImperativeHandle(ref, () => inputRef.current!);

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={inputRef}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          {...props}
        />
        <div
          ref={caretRef}
          className={cn(
            "absolute w-[2px] h-[1.2em] bg-black dark:bg-white pointer-events-none transition-opacity",
            isFocused ? "animate-blink" : "opacity-0"
          )}
          style={{
            position: 'absolute',
            visibility: isFocused ? 'visible' : 'hidden'
          }}
        />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
