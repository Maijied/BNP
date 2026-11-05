"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/** Decorative motion only. No order/customer state or appearance persistence. */
export function ExperienceMotion({ children, identity }: { children: ReactNode; identity: "bnp" | "vespa" }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const reduced = paused || preference.matches;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      element.style.setProperty("--read-progress", String(height > 0 ? window.scrollY / height : 0));
      element.style.setProperty("--hero-drift", reduced ? "0px" : `${Math.min(window.scrollY * 0.13, 110)}px`);
      element.dataset.motion = reduced ? "paused" : "active";
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    preference.addEventListener("change", schedule);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.setAttribute("data-seen", "true"); observer.unobserve(entry.target); } });
    }, { threshold: 0.12 });
    element.querySelectorAll("[data-reveal]").forEach(item => observer.observe(item));
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); preference.removeEventListener("change", schedule); };
  }, [paused]);
  return <MotionConfig reducedMotion={paused ? "always" : "user"}><div ref={root} className={`experience experience-${identity}`} data-experience={identity}>
    <div className="exp-progress" aria-hidden="true" />
    {children}
    <button type="button" className="exp-motion-toggle" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? "Motion paused" : "Pause motion"}</button>
  </div></MotionConfig>;
}
