import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-fc-56 w-full min-w-0 rounded-fc-24 border border-input bg-fc-bg px-fc-18 py-fc-12 text-fc-18 text-fc-ink transition-[color,box-shadow] outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-[3px] focus-visible:ring-ring/24",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-[0.48]",
        "aria-invalid:ring-[3px] aria-invalid:ring-destructive/24",
        className
      )}
      {...props}
    />
  )
}

export { Input }
