import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-fc-24 border border-transparent font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/24 disabled:pointer-events-none disabled:opacity-48 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/24 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-fc-ink bg-transparent text-foreground hover:bg-fc-ink hover:text-background",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-fc-panel-blue/80",
        ghost:
          "text-foreground hover:bg-fc-ink/12",
        destructive:
          "bg-destructive text-white hover:bg-destructive/80 focus-visible:ring-destructive/24",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-fc-48 gap-fc-12 px-fc-24 text-fc-14",
        sm: "h-fc-36 gap-fc-12 px-fc-18 text-fc-12",
        lg: "h-fc-56 gap-fc-12 px-fc-24 text-fc-18",
        icon: "size-fc-48",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
