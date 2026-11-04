
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-headline text-[1.05rem] font-semibold tracking-wide transition-[transform,background-color,color] duration-100 ease-out disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "px-raised bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1",
        destructive:
          "px-raised bg-destructive text-destructive-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1",
        outline:
          "px-raised bg-card hover:bg-accent hover:text-accent-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1",
        secondary:
          "px-raised bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
