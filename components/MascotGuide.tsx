import type { ReactNode } from "react";

/** Existing design concepts used in this local preview, not a final mascot selection. */
export default function MascotGuide({ title, children, variant = "concierge", compact = false }: { title: string; children: ReactNode; variant?: "concierge" | "rider"; compact?: boolean }) {
  return <aside className={`mascot-guide${compact ? " mascot-guide-compact" : ""}`}>
    <img src={`/images/mascot/${variant}.png`} width="1280" height="1280" alt="" aria-hidden="true" loading="lazy" />
    <div><span className="exp-label">LORAPOK LABS / YOUR GUIDE</span><strong>{title}</strong><div className="mascot-guide-copy">{children}</div></div>
  </aside>;
}
