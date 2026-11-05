"use client";
import { useEffect, useRef, useState } from "react";
/** The recovered five-second material study, not generated replacement rider footage. */
export default function CinematicMaterial({ paused, reduced, replay = 0 }: { paused: boolean; reduced: boolean; replay?: number }) {
  const root = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => { const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .12 }); if (root.current) observer.observe(root.current); return () => observer.disconnect(); }, []);
  useEffect(() => { const media = video.current; if (!media) return; if (paused || reduced || !visible || failed) media.pause(); else { void media.play().catch(() => setFailed(true)); } }, [paused, reduced, visible, failed]);
  useEffect(() => { if (replay && video.current && !reduced) { setFailed(false); video.current.currentTime = 0; if (!paused && visible) void video.current.play().catch(() => setFailed(true)); } }, [replay]);
  return <div ref={root} className="bn-material" aria-hidden="true"><img src="/media/bnp-material-poster.png" alt="" width="1344" height="768"/>{!reduced && <video ref={video} src={visible ? "/media/bnp-material-original.mp4" : undefined} muted playsInline preload="none" poster="/media/bnp-material-poster.png" onError={() => setFailed(true)} style={{ opacity: failed ? 0 : 1 }}/>}</div>;
}
