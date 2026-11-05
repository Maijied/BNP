"use client";

import { ArrowDown, ArrowUpRight, Phone } from "lucide-react";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import { useStorefront } from "@/components/StorefrontContext";
import { useStorefrontTheme } from "@/components/StorefrontTheme";

export function ThemedNavigation() {
  const { theme } = useStorefrontTheme();
  if (theme === "classic") return <Navbar hotline="01632333221" />;
  return (
    <header className="ms-nav">
      <div className="ms-container ms-nav-inner">
        <a className="ms-wordmark" href="#" aria-label="BNP Bike Number Plate home">
          <strong>B<span>N</span>P</strong><small>BIKE NUMBER PLATE</small>
        </a>
        <nav aria-label="Main navigation" className="ms-nav-links">
          <a href="#collection">The collection</a><a href="#designer">Plate studio</a><a href="#pricing">Pricing</a><a href="#faq">Help</a>
        </nav>
        <div className="ms-nav-actions">
          <a className="ms-phone" href="tel:01632333221" aria-label="Call BNP at 01632333221"><Phone size={17} /></a>
          <a className="ms-button ms-button-small" href="#designer">Customize yours <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </div>
    </header>
  );
}

export function ThemedHero() {
  const { theme } = useStorefrontTheme();
  if (theme === "classic") return <Hero />;
  return (
    <section className="ms-hero" aria-labelledby="motorsport-title">
      <div className="ms-hero-image-wrap">
        {/* Use the actual uploaded photograph. No generative changes to the scooter. */}
        <img src="/images/themes/own-scooter-front.jpg" width="1358" height="2048" alt="The owner's restored navy-blue and silver scooter with its round chrome headlamp, amber indicators and original creator mark." className="ms-hero-image" fetchPriority="high" />
      </div>
      <div className="ms-hero-shade" aria-hidden="true" />
      <div className="ms-track-line" aria-hidden="true" />
      <div className="ms-container ms-hero-content">
        <p className="ms-eyebrow"><span /> THE BNP COLLECTION · 01</p>
        <h1 id="motorsport-title">YOUR RIDE.<br />YOUR<br /><em>SIGNATURE.</em></h1>
        <p className="ms-hero-description">A little metal. A lot of character.<br />Find your format. Make every detail yours.</p>
        <a className="ms-button" href="#designer">Design your plate <ArrowUpRight size={20} aria-hidden="true" /></a>
        <a className="ms-text-link" href="#collection">Explore the collection <ArrowDown size={18} aria-hidden="true" /></a>
        <p className="ms-hero-credit">Ecommerce by <strong>Lorapok Labs</strong></p>
      </div>
      <div className="ms-image-caption"><span>THE OWNER’S RESTORATION</span><strong>Navy. Silver. One of a kind.</strong><small>Original photograph · Details preserved</small></div>
    </section>
  );
}

export function MotorsportCollection() {
  const { theme } = useStorefrontTheme();
  const { model, setModel } = useStorefront();
  if (theme !== "motorsport") return null;
  const selectModel = (next: "A" | "B") => {
    setModel(next);
    document.getElementById("designer")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  return (
    <>
      <div className="ms-flow-strip" aria-label="How to personalize your plate"><span>CHOOSE YOUR FORMAT</span><i aria-hidden="true">/</i><span>ADD YOUR DETAILS</span><i aria-hidden="true">/</i><span>REVIEW YOUR PLATE</span></div>
      <section id="collection" className="ms-collection ms-container" aria-labelledby="collection-title">
        <div className="ms-section-heading"><div><p className="ms-eyebrow">01 / THE COLLECTION</p><h2 id="collection-title">FIND YOUR FIT.</h2></div><a className="ms-text-link" href="#pricing">View pricing <ArrowUpRight size={18} aria-hidden="true" /></a></div>
        <div className="ms-format-grid">
          <button type="button" className="ms-format-card" aria-pressed={model === "A"} onClick={() => selectModel("A")}>
            <span className="ms-card-top">01 / MOTORCYCLE <span>{model === "A" ? "SELECTED" : "MODEL A"}</span></span>
            <span className="ms-plate-stage"><span className="ms-sample-plate ms-sample-motorcycle" lang="bn">ঢাকা মেট্রো-ল ১২-৩৪৫৬</span></span>
            <span className="ms-card-title">Motorcycle format <ArrowUpRight aria-hidden="true" /></span><span className="ms-card-detail">Single-line preview · Customize in the plate studio</span>
          </button>
          <button type="button" className="ms-format-card" aria-pressed={model === "B"} onClick={() => selectModel("B")}>
            <span className="ms-card-top">02 / SCOOTER <span>{model === "B" ? "SELECTED" : "MODEL B"}</span></span>
            <span className="ms-plate-stage"><span className="ms-sample-plate ms-sample-scooter" lang="bn">ঢাকা মেট্রো<br />ল-১২-৩৪৫৬</span></span>
            <span className="ms-card-title">Scooter format <ArrowUpRight aria-hidden="true" /></span><span className="ms-card-detail">Two-line preview · Confirm fit before manufacturing</span>
          </button>
        </div>
        <p className="ms-legal-note">Sample layouts only. Fit, dimensions and current BRTA requirements must be verified before road use. Decorative designs are not road-use approvals.</p>
      </section>
    </>
  );
}

export function MotorsportStory() {
  const { theme } = useStorefrontTheme();
  if (theme !== "motorsport") return null;
  return (
    <section className="ms-story" aria-labelledby="story-title">
      <div className="ms-container">
        <div className="ms-section-heading"><div><p className="ms-eyebrow">THE OWNER’S RESTORATION</p><h2 id="story-title">BUILT AROUND<br /><em>YOUR RIDE.</em></h2></div><p className="ms-story-intro">Original character. Personal details.<br />The photographs tell the story.</p></div>
        <div className="ms-owner-grid">
          <figure><img loading="lazy" src="/images/themes/own-scooter-wheel.jpg" width="1358" height="2048" alt="The owner's blue front fender with silver stripes, chrome trim and restored wheel." /><figcaption>Every stripe. Every detail.</figcaption></figure>
          <figure><img loading="lazy" src="/images/themes/own-scooter-speedometer.jpg" width="1358" height="2048" alt="Original amber-lit Bajaj speedometer in the owner's navy-blue handlebar housing." /><figcaption>Character, kept intact.</figcaption></figure>
          <figure><img loading="lazy" src="/images/themes/own-vespa.jpg" width="1152" height="2048" alt="The owner's restored navy and silver scooter with a grey cat and black helmet on its separate saddles." /><figcaption>A ride with a story.</figcaption></figure>
        </div>
        <p className="ms-legal-note">Original owner-supplied photos. Paintwork, existing badges and creator marks are preserved. No model-year or mechanical specifications are inferred.</p>
        <div className="ms-editorial-heading"><p className="ms-eyebrow">MORE CLASSIC INSPIRATION</p><h3>Different rides. Shared character.</h3></div>
        <div className="ms-editorial-grid">
          <figure><img loading="lazy" src="/images/themes/vespa-ivory.jpg" width="1080" height="1080" alt="Off-white classic Vespa P 150 X parked in a workshop." /><figcaption><strong>Workshop character</strong><span>1981 Vespa P 150 X</span></figcaption></figure>
          <figure><img loading="lazy" src="/images/themes/vespa-green.jpg" width="2737" height="2305" alt="Green Vespa PX150E with a tan saddle parked against a pale stone wall." /><figcaption><strong>Timeless lines</strong><span>Vespa PX150E Arcobaleno</span></figcaption></figure>
          <figure><img loading="lazy" src="/images/themes/vespa-detail.jpg" width="1080" height="1080" alt="Square headlight and chrome trim on a classic Vespa PS." /><figcaption><strong>Details that stay</strong><span>Vespa PS headlight</span></figcaption></figure>
        </div>
        <p className="ms-legal-note">Supporting editorial photographs, not our inventory or the owner’s scooter. No Vespa, Piaggio or motorsport affiliation is implied.</p>
        <details className="ms-photo-credits"><summary>Photography credits & licenses</summary><ul>
          <li>The navy-and-silver hero and restoration details are the owner’s original uploaded photographs. Files and creator marks are unchanged; images are fitted within responsive panels.</li>
          <li><a href="https://commons.wikimedia.org/wiki/File:1981_Vespa_P_150_X.jpg" target="_blank" rel="noopener noreferrer">1981 Vespa P 150 X</a> and <a href="https://commons.wikimedia.org/wiki/File:Vespa_PS_lamp.jpg" target="_blank" rel="noopener noreferrer">Vespa PS lamp</a> by Zooarman, Wikimedia Commons, <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0 1.0</a>. Original files, cropped for display.</li>
          <li><a href="https://commons.wikimedia.org/wiki/File:Vespa_PX150E_Elestart_Arcobaleno.jpg" target="_blank" rel="noopener noreferrer">Vespa PX150E Elestart Arcobaleno</a> by Corvettec6r, Wikimedia Commons, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Original file, cropped for display; no color changes.</li>
        </ul></details>
      </div>
    </section>
  );
}

export function LorapokBrandSignature() {
  return (
    <aside className="bnp-brand-signature" aria-label="Lorapok Labs product branding">
      <div className="bnp-brand-signature-inner">
        <img className="bnp-brand-mascot" src="/images/themes/lorapok-mascot.png" width="1254" height="1254" alt="Lorapok Labs' established green caterpillar mascot" loading="lazy" />
        <div><span>A LORAPOK LABS PRODUCT</span><p>Products that feel alive.</p><small>BNP ecommerce · Built around your ride.</small></div>
        <a href="https://lorapok.tech" target="_blank" rel="noopener noreferrer" aria-label="Visit Lorapok Labs"><img src="/images/themes/lorapok-labs.svg" width="900" height="240" alt="Lorapok Labs" loading="lazy" /></a>
      </div>
    </aside>
  );
}
