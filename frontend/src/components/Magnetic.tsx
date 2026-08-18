import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Magnetic wrapper: the child drifts toward the pointer as it approaches,
 * then springs back. Purely a pointer effect — no layout impact, and it
 * quietly does nothing on touch or under reduced motion.
 */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "translate3d(0, 0, 0)";
  };

  return (
    <span
      ref={ref}
      data-magnetic
      className={cn("magnetic inline-flex", className)}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        if (e.pointerType !== "mouse") return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
      }}
      onPointerLeave={reset}
      onPointerUp={reset}
    >
      {children}
    </span>
  );
}
