import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & {
    value?: number
  }
>(({ className, value, ...props }, ref) => (
  <div ref={ref} className={cn(
    "relative h-4 w-full overflow-hidden rounded-full bg-slate-200",
    className
  )} {...props}>
    <div
      className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }

