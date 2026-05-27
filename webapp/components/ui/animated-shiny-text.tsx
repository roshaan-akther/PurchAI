import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FC,
} from "react"

import { cn } from "@/lib/utils"

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
          backgroundImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.8) 50%, transparent 100%)",
          backgroundSize: "var(--shiny-width) 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          backgroundPosition: "0 0",
          backgroundRepeat: "no-repeat",
          transition: "background-position 1s cubic-bezier(0.6,0.6,0,1) infinite",
        } as CSSProperties
      }
      className={cn(
        "mx-auto max-w-md text-neutral-600/70 dark:text-neutral-400/70 animate-shiny-text",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
