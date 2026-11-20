import { cn } from "cn"

/**
 * Loading placeholder: a visible-but-quiet block (foreground at 8%, so it reads on both
 * the page and card surfaces) with a soft shimmer. The shimmer stops for reduced motion.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-sm bg-foreground/[0.08]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent motion-reduce:before:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
