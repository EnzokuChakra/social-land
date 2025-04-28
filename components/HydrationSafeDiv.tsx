import { HTMLAttributes } from 'react';

type HydrationSafeDivProps = HTMLAttributes<HTMLDivElement>;

export function HydrationSafeDiv(props: HydrationSafeDivProps) {
  return (
    <div {...props} suppressHydrationWarning />
  );
} 