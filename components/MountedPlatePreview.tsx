"use client";

import { useId, useState } from "react";
import { Focus, Maximize2 } from "lucide-react";
import { convertDigitsToBangla } from "@/lib/bengali";
import styles from "./MountedPlatePreview.module.css";

type Finish = "cream" | "charcoal" | "silver" | "oxblood";
type Props = {
  variant?: "registration" | "decorative";
  model?: "A" | "B";
  region?: string;
  letter?: string;
  digits?: string;
  text?: string;
  finish?: Finish;
  lang?: "bn" | "en";
};

// Photo-space anchors, not viewport offsets. Image and lettering always scale together.
// Sources are unchanged owner-supplied photographs; only the live SVG plate is added.
const scenes = {
  motorcycle: { src: "/images/bnp/plate-fit-source.jpg", width: 1073, height: 1600, full: "45 470 585 950", detail: "150 610 370 340", mount: "matrix(.635 .182 -.24 .76 234 676)", plateWidth: 285, plateHeight: 50 },
  scooter: { src: "/images/themes/own-scooter-front.jpg", width: 1358, height: 2048, full: "235 100 1123 1760", detail: "590 640 700 670", mount: "matrix(1.46 -.47 .68 1.7 745 940)", plateWidth: 200, plateHeight: 100 },
  vintage: { src: "/images/themes/own-vespa.jpg", width: 1152, height: 2048, full: "0 640 1050 1408", detail: "0 1390 490 650", mount: "matrix(.94 .267 -.121 .93 70 1627)", plateWidth: 150, plateHeight: 210 },
} as const;
const finishes: Record<Finish, { light: string; mid: string; dark: string; ink: string; edge: string }> = {
  cream: { light: "#f5efde", mid: "#ded1b5", dark: "#c9b99a", ink: "#292821", edge: "#4d4637" },
  charcoal: { light: "#41433d", mid: "#242922", dark: "#151c18", ink: "#dcc58c", edge: "#b39a5f" },
  silver: { light: "#f0f0e9", mid: "#aeb6b5", dark: "#828e91", ink: "#1c2529", edge: "#596568" },
  oxblood: { light: "#793934", mid: "#562622", dark: "#381b1b", ink: "#eee0bf", edge: "#d6c29b" },
};

function phraseLines(value: string) {
  const words = (value.trim() || "YOUR STORY").split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 12) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  if (lines.length > 5) return [lines.slice(0, 2).join(" "), lines.slice(2, 4).join(" "), lines.slice(4, 6).join(" "), lines.slice(6, 8).join(" "), lines.slice(8).join(" ")].filter(Boolean);
  return lines;
}

export default function MountedPlatePreview({ variant = "registration", model = "A", region = "ঢাকা মেট্রো", letter = "ল", digits = "১২৩৪৫৬", text = "YOUR STORY", finish = "cream", lang = "en" }: Props) {
  const id = useId().replace(/:/g, "");
  const [detail, setDetail] = useState(false);
  const decorative = variant === "decorative";
  const scene = decorative ? scenes.vintage : model === "A" ? scenes.motorcycle : scenes.scooter;
  const normalized = convertDigitsToBangla(digits.replace(/[-\s]/g, ""));
  const serial = `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  const registration = model === "A" ? `${region}-${letter} ${serial}` : `${region} ${letter}-${serial}`;
  const display = decorative ? text.trim() || "YOUR STORY" : registration;
  const palette = decorative ? finishes[finish] : finishes.silver;
  const lines = phraseLines(display);
  const t = (bn: string, en: string) => lang === "bn" ? bn : en;
  const caption = decorative
    ? "Your words on the original scooter photo. Decorative mock-up only; placement, size and mounting need confirmation. Never a registration replacement."
    : t("মূল ছবিতে আপনার নম্বরের নকশা। এটি ফিট বা অনুমোদনের প্রমাণ নয়; মাপ ও মাউন্টিং আগে যাচাই করতে হবে।", "Your number on the original photo. Visual mock-up, not a fit or compliance approval. Size and mounting need verification.");
  const width = scene.plateWidth, height = scene.plateHeight;
  return <figure className={`${styles.root} ${decorative ? styles.vintage : ""}`} data-plate-preview={decorative ? "decorative" : model} data-preview-text={display}>
    <div className={styles.toolbar}>
      <span><i aria-hidden="true" />{t("বাইকে লাইভ প্রিভিউ", "LIVE ON THE BIKE")}</span>
      <div role="group" aria-label={t("প্রিভিউয়ের ভিউ", "Photo preview view")}>
        <button type="button" aria-pressed={!detail} onClick={() => setDetail(false)}><Maximize2 size={12} aria-hidden="true" />{t("বাইক", "Bike")}</button>
        <button type="button" aria-pressed={detail} onClick={() => setDetail(true)}><Focus size={12} aria-hidden="true" />{t("কাছে দেখুন", "Detail")}</button>
      </div>
    </div>
    <div className={styles.scene}>
      <svg viewBox={detail ? scene.detail : scene.full} preserveAspectRatio="xMidYMid slice" className={styles.photo} role="img" aria-label={`${decorative ? "Decorative nameplate" : `Model ${model} front plate`} on the original ${decorative || model === "B" ? "navy and silver scooter" : "red motorcycle"} photograph: ${display}. Illustrative placement only.`}>
        <defs>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2=".8"><stop stopColor={palette.light} /><stop offset=".32" stopColor={palette.mid} /><stop offset=".66" stopColor={palette.light} /><stop offset="1" stopColor={palette.dark} /></linearGradient>
          <linearGradient id={`${id}-light`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".24" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#05121d" stopOpacity=".16" /></linearGradient>
          <filter id={`${id}-contact`} x="-.2" y="-.2" width="1.5" height="1.6"><feDropShadow dx="1.4" dy="2.4" stdDeviation="1.5" floodColor="#080e15" floodOpacity=".7" /></filter>
        </defs>
        <image href={scene.src} width={scene.width} height={scene.height} />
        <g transform={scene.mount} data-mounted-lettering="true">
          <g filter={`url(#${id}-contact)`}>
            <rect x="0" y="0" width={width} height={height} rx={decorative ? 3 : 4} fill={`url(#${id}-metal)`} stroke={palette.dark} strokeWidth="1.4" />
            <rect x="3" y="3" width={width - 6} height={height - 6} rx="2" fill="none" stroke={decorative ? palette.edge : "#f2f0df"} strokeWidth={decorative ? 1.8 : .8} opacity=".8" />
            <rect x="0" y="0" width={width} height={height} rx="3" fill={`url(#${id}-light)`} />
            {decorative ? <>
              <text x="75" y="40" textAnchor="middle" fill={palette.ink} fontSize="15">✦</text>
              <text textAnchor="middle" fill={palette.ink} fontFamily="Georgia, var(--font-hind-siliguri), serif" fontWeight="700" fontSize={lines.length > 3 ? 20 : 25}>
                {lines.map((line, index) => <tspan key={index} x="75" y={107 - (lines.length - 1) * (lines.length > 3 ? 12 : 15) + index * (lines.length > 3 ? 24 : 30)} textLength={line.length > 9 ? 125 : undefined} lengthAdjust="spacingAndGlyphs">{line}</tspan>)}
              </text>
              <path d="M45 169H105" stroke={palette.ink} strokeWidth=".8" opacity=".65" />
              <text x="75" y="187" textAnchor="middle" fontSize="6" letterSpacing=".5" fill={palette.ink}>DECORATIVE CONCEPT</text>
            </> : <text fill="#151b1e" textAnchor="middle" fontFamily="var(--font-hind-siliguri), sans-serif" fontWeight="700" lang="bn">
              {model === "A" ? <tspan x="142.5" y="34" fontSize="24" textLength="258" lengthAdjust="spacingAndGlyphs">{registration}</tspan> : <><tspan x="100" y="45" fontSize="25" textLength={region.length > 13 ? 170 : undefined} lengthAdjust="spacingAndGlyphs">{region}</tspan><tspan x="100" y="80" fontSize="29" textLength="174" lengthAdjust="spacingAndGlyphs">{letter}-{serial}</tspan></>}
            </text>}
            {[width * .18, width * .82].map(x => <g key={x} aria-hidden="true"><ellipse cx={x} cy={decorative ? 13 : 7} rx={decorative ? 2.4 : 3} ry={decorative ? 2.4 : 1.9} fill="#667070" stroke="#e4e1cf" strokeWidth=".7" /><path d={`M${x - 1.2} ${decorative ? 13 : 7}h2.4`} stroke="#293236" strokeWidth=".8" /></g>)}
          </g>
        </g>
      </svg>
      <span className={styles.badge}>{t("ছবির ওপর নকশা · মাপ যাচাই হয়নি", "PHOTO MOCK-UP · FIT NOT VERIFIED")}</span>
    </div>
    <figcaption className={styles.caption}>{caption}</figcaption>
  </figure>;
}
