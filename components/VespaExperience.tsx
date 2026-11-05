"use client";

import { useEffect, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowUpRight, MoveUpRight, Moon, Sun } from "lucide-react";
import { ExperienceMotion } from "@/components/ExperienceMotion";
import VintageOrderStudio from "@/components/VintageOrderStudio";
import { VESPA_THEME_KEY, resolveVespaTheme, readVespaTheme, saveVespaTheme } from "@/lib/vespa-theme.mjs";

type VespaTheme = "light" | "dark";

/** An intact owner photograph on a shallow perspective plane, not a 3D model.
 * Only empty sky above the highest mirror is trimmed by the CSS window. */
function moveOwnerPortrait(event: PointerEvent<HTMLElement>) {
  const plane = event.currentTarget;
  if (event.pointerType !== "mouse" || plane.closest('[data-motion="paused"]') || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const bounds = plane.getBoundingClientRect();
  const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
  const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
  plane.style.setProperty("--portrait-rotate-x", `${(-y * 1.25).toFixed(2)}deg`);
  plane.style.setProperty("--portrait-rotate-y", `${(x * 2).toFixed(2)}deg`);
  plane.style.setProperty("--portrait-light-x", `${50 + x * 20}%`);
}
function resetOwnerPortrait(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty("--portrait-rotate-x", "0deg");
  event.currentTarget.style.setProperty("--portrait-rotate-y", "0deg");
  event.currentTarget.style.setProperty("--portrait-light-x", "50%");
}
function OwnerScooterPortrait() {
  return <figure className="vespa-owner-portrait" onPointerMove={moveOwnerPortrait} onPointerLeave={resetOwnerPortrait} onPointerCancel={resetOwnerPortrait} aria-label="The owner's restored scooter, presented as a layered photographic study">
    <div className="vespa-owner-backplane" aria-hidden="true"><span>01</span></div>
    <div className="vespa-owner-shadow" aria-hidden="true" />
    <div className="vespa-owner-plane">
      <div className="vespa-owner-window"><img src="/images/themes/own-vespa.jpg" width="1152" height="2048" fetchPriority="high" draggable={false} alt="The owner's original navy and silver scooter photograph, showing the full photographed scooter from the rear, with grey cat, black helmet, chrome mirrors and original Bengali registration plate. No scooter details have been redrawn." /></div>
      <div className="vespa-owner-edge" aria-hidden="true" />
    </div>
    <figcaption><span><b>THE OWNER’S RESTORATION</b><small>Navy, silver & a little company.</small></span><a href="/images/themes/own-vespa.jpg" target="_blank" rel="noopener noreferrer">Original photo <ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></figcaption>
  </figure>;
}

export default function VespaExperience() {
  // The first render matches the current white/cream shop. Theme is appearance only.
  const [theme, setTheme] = useState<VespaTheme>("light");
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    try { setTheme(readVespaTheme(window.localStorage)); } catch { /* Appearance works without storage. */ }
    const sync = (event: StorageEvent) => {
      if (event.key === VESPA_THEME_KEY || event.key === null) {
        setTheme(resolveVespaTheme(event.newValue));
        setSaved(true);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function selectTheme(next: VespaTheme) {
    setTheme(next);
    try { setSaved(saveVespaTheme(window.localStorage, next)); } catch { setSaved(false); }
  }
  return <div className="vespa-theme-root" data-vespa-theme={theme}><ExperienceMotion identity="vespa"><div className={`vintage-shop vespa-theme-${theme}`}>
    <a className="vt-skip" href="#vintage-main">Skip to content</a>
    <div className="vt-utility"><span>VESPA / A LORAPOK LABS ATELIER</span><span>DESIGN PREVIEW · NO LIVE PAYMENTS</span></div>
    <header className={`vt-nav vespa-shop-nav ${theme === "dark" ? "vespa-nav-dark" : ""}`}>
      <a href="/vespa" className={theme === "dark" ? "vespa-wordmark" : "vt-wordmark"} aria-label="Vespa vintage nameplate shop home">{theme === "dark" ? "VESPA" : <><span>Vintage plate</span><em>atelier.</em><small>WORKING NAME</small></>}</a>
      <nav aria-label="Vespa shop navigation"><a href="#collection">The collection</a><a href="#atelier">Personalize</a><a href="#our-story">Our story</a></nav>
      <fieldset className="vespa-theme-switch" aria-describedby="vespa-theme-note">
        <legend className="sr-only">Vespa shop appearance</legend>
        <label><input type="radio" name="vespa-appearance" value="light" checked={theme === "light"} onChange={() => selectTheme("light")} /><span><Sun size={14} aria-hidden="true" /> Light</span></label>
        <label><input type="radio" name="vespa-appearance" value="dark" checked={theme === "dark"} onChange={() => selectTheme("dark")} /><span><Moon size={14} aria-hidden="true" /> Dark</span></label>
      </fieldset>
    </header>
    <p className="vespa-theme-note" id="vespa-theme-note" role="status">{saved ? "Two looks. One shop. Your nameplate stays with you." : "Theme applied for this visit. Browser storage is unavailable."}</p>
    <main id="vintage-main">
      {theme === "dark" ? <>
      <section className="vespa-hero vespa-layered-hero" aria-labelledby="vespa-title">
        <div className="vespa-hero-copy"><p className="exp-label"><i/> CHARACTER / WITHOUT COMPROMISE</p><h1 id="vespa-title"><span>OLD SOUL.</span><span>NEW</span><em>ENERGY.</em></h1><p>A love for the details.<br />An antique-inspired nameplate, made personal.</p><a className="exp-button" href="#collection">Explore the nameplates <ArrowUpRight size={20} aria-hidden="true"/></a></div>
        <OwnerScooterPortrait />
        <div className="vespa-hero-watermark" aria-hidden="true">VESPA</div>
        <a className="vespa-scroll" href="#our-story"><span>SCROLL TO DISCOVER</span><ArrowDown size={17} aria-hidden="true"/></a>
      </section>
      <div className="vespa-spec-strip"><span><i/> THE ORIGINAL PHOTOGRAPHS</span><span>THE DETAILS PRESERVED</span><span>THE NEXT CHAPTER</span></div>
      </> : <>
      <section className="vt-hero vespa-layered-hero" aria-labelledby="vintage-title">
        <div className="vt-hero-copy">
          <p className="vt-eyebrow"><span /> DECORATIVE NAMEPLATES · COLLECTION STUDY 01</p>
          <h1 id="vintage-title">Old soul.<br />Your <em>signature.</em></h1>
          <p className="vt-hero-description">For the rides that already have a story.<br />Explore four vintage-inspired nameplates,<br className="vt-desktop-break" /> then make the words your own.</p>
          <a className="vt-button" href="#collection">Explore the collection <MoveUpRight size={19} aria-hidden="true" /></a>
          <div className="vt-hero-note"><span className="vt-note-mark" aria-hidden="true">✳</span><p>A little nostalgia.<br /><strong>A very personal finishing touch.</strong></p></div>
          <a className="vt-scroll" href="#collection"><ArrowDown size={15} aria-hidden="true" /> FOUR FINISH DIRECTIONS. ONE PERSONAL STORY.</a>
        </div>
        <OwnerScooterPortrait />
        <div className="vt-hero-side" aria-hidden="true">CHARACTER IS IN THE DETAILS</div>
      </section>
      <div className="vt-intro-strip"><span><b>01</b> Choose a finish</span><i aria-hidden="true" /><span><b>02</b> Make it personal</span><i aria-hidden="true" /><span><b>03</b> Review your nameplate</span><span className="vt-strip-note">Decorative concepts. Fit to be confirmed.</span></div>
      </>}
      {/* One stable studio: theme switches never remount catalog, draft, review or pending requests. */}
      <VintageOrderStudio />
      {theme === "dark" ? <>
      <section id="our-story" className="vespa-story exp-container exp-section" aria-labelledby="vespa-story-title">
        <div className="vespa-story-heading" data-reveal><p className="exp-label">01 / MORE THAN A MACHINE</p><h2 id="vespa-story-title">SOME THINGS<br />AREN’T MADE<br /><em>TO BLEND IN.</em></h2></div>
        <div className="vespa-story-text" data-reveal><img className="vespa-story-mascot" src="/images/mascot/rider.png" width="1280" height="1280" loading="lazy" alt="Lorapok Labs classic rider mascot"/><span className="vespa-section-number">01—</span><p>Navy paint. Silver lines. Chrome that catches the light. A ride with its own unmistakable character.</p><p>The story starts with the owner’s restoration, photographed as it is. Its paintwork, badges and individual details stay exactly where they belong.</p><a className="exp-text-link" href="#details">Look a little closer <ArrowDown size={17} aria-hidden="true"/></a></div>
      </section>
      <section id="details" className="vespa-details exp-container" aria-labelledby="vespa-details-title">
        <div className="exp-section-heading" data-reveal><p className="exp-label">02 / IN THE DETAILS</p><h2 id="vespa-details-title">CHARACTER.<br /><em>IN EVERY LINE.</em></h2></div>
        <div className="vespa-detail-grid">
          <figure className="vespa-detail-tall" data-reveal><img src="/images/themes/own-scooter-wheel.jpg" width="1358" height="2048" loading="lazy" alt="Original owner photograph of the navy front fender, silver stripes, chrome trim and restored scooter wheel."/><figcaption><span>01 / THE FINISH</span><strong>Every stripe has a story.</strong></figcaption></figure>
          <figure data-reveal><img src="/images/themes/own-scooter-speedometer.jpg" width="1358" height="2048" loading="lazy" alt="Original amber-lit Bajaj speedometer in the navy handlebar housing, manufacturer markings preserved."/><figcaption><span>02 / THE INSTRUMENTS</span><strong>Character, kept intact.</strong></figcaption></figure>
          <figure data-reveal><img src="/images/themes/own-vespa.jpg" width="1152" height="2048" loading="lazy" alt="The owner’s navy and silver scooter beside a road, with a grey cat and helmet on its separate saddles."/><figcaption><span>03 / THE EVERYDAY</span><strong>Life comes along for the ride.</strong></figcaption></figure>
        </div>
      </section>
      </> : <>
      <section id="our-story" className="vt-story vt-container" aria-labelledby="vintage-story-title">
        <figure className="vt-story-photo" data-reveal><img src="/images/themes/own-scooter-front.jpg" alt="Original owner photo of the navy and silver scooter front, with original badges and creator marks preserved." width="1358" height="2048" loading="lazy" /><figcaption>THE OWNER’S RESTORATION / ORIGINAL PHOTOGRAPH</figcaption></figure>
        <div className="vt-story-copy" data-reveal><p className="vt-eyebrow">THE RIDE BEHIND THE COLLECTION</p><h2 id="vintage-story-title">Some things<br />get better<br /><em>with a story.</em></h2><p>Navy paint. Silver lines. A grey cat with a favourite seat. This collection is inspired by the owner’s restored scooter and its individual details.</p><p>The original photographs keep the restoration as it is, including its badges and individual marks. The nameplate images are separate decorative visual concepts, not verified fittings or replacement registration plates.</p><a className="vt-text-link" href="#atelier">Add your own chapter <ArrowUpRight size={18} aria-hidden="true" /></a></div>
      </section>
      </>}
      <section className="vt-before-you-order vt-container" aria-labelledby="vintage-notes-title">
        <div><p className="vt-eyebrow">A SMALL NOTE BEFORE WE BEGIN</p><h2 id="vintage-notes-title">Character, with clarity.</h2></div>
        <div className="vt-note-grid"><article><span>01 / THE NAME</span><h3>A working title.</h3><p>“Vintage plate atelier” is a descriptive working name. The final shop name and product names are still to be selected.</p></article><article><span>02 / THE PRODUCT</span><h3>A decorative direction.</h3><p>Finish names describe the visual concepts. Materials, dimensions, mounting, model fit and road-use suitability are not yet verified.</p></article><article><span>03 / THE REQUEST</span><h3>No payment. No dispatch.</h3><p>Where available, sample requests are recorded without payment. They do not confirm a final price, production or delivery.</p></article></div>
      </section>
    </main>
    <footer className="vt-footer"><div className="vt-container"><div className="vt-footer-top"><div><span className="vt-footer-name">A name of your own.</span><a className="vt-text-link" href="#collection">Back to the collection <ArrowUpRight size={18} aria-hidden="true" /></a></div><img src="/images/themes/lorapok-labs.svg" width="200" height="53" loading="lazy" alt="Lorapok Labs" /></div><div className="vt-footer-bottom"><p>An independent Lorapok Labs nameplate shop. Not affiliated with Vespa or Piaggio. The photographs do not establish the scooter’s make, model or fitment.</p><p>Looking for motorcycle or scooter front plates?<br /><a href="/bnp">Visit the separate BNP store <ArrowUpRight size={13} aria-hidden="true" /></a></p><span>LOCAL DESIGN PREVIEW<br />PAYMENTS DISABLED</span></div><p className="vt-system-note">Product specifications, availability and final pricing must be confirmed before production.</p></div></footer>
  </div></ExperienceMotion></div>;
}
