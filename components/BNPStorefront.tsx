"use client";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  Clock,
  Eye,
  KeyRound,
  Lock,
  Menu,
  Package,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Unlock,
  X
} from "lucide-react";
import { MotionConfig, motion } from "framer-motion";
import { StorefrontProvider, useStorefront } from "@/components/StorefrontContext";
import { StorefrontThemeProvider, useStorefrontTheme } from "@/components/StorefrontTheme";
import BNPOrderStudio, { Language, Plate } from "@/components/BNPOrderStudio";
import Hero from "@/components/Hero";
import CinematicMaterial from "@/components/CinematicMaterial";

function toBanglaDigits(val: number | string): string {
  const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(val).replace(/\d/g, d => digits[Number(d)]);
}

const LAUNCH_TARGET = new Date("2026-05-15T18:00:00+06:00").getTime();

function calculateTimeLeft() {
  const diff = Math.max(0, LAUNCH_TARGET - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: diff <= 0,
  };
}

const LOOKBOOK_PHOTOS = [
  {
    id: "night",
    src: "/images/bnp/rider-night.jpg",
    width: 1073,
    height: 1600,
    titleBn: "রাতের টানেলে রাইডার ও বাইক",
    titleEn: "Night Tunnel Rider & Red Motorcycle",
    tagBn: "০১ / অফিশিয়াল স্টাডি",
    tagEn: "01 / OFFICIAL ATELIER STUDY",
    descBn: "আসল বিএনপি ফটোগ্রাফি: আলোকিত টানেলে লাল মোটরসাইকেলের পাশে হেলমেট পরা নারী রাইডার ও ফ্রন্ট প্লেট।",
    descEn: "Original BNP photography: helmeted woman rider holding front number plate beside red motorcycle in neon tunnel."
  },
  {
    id: "studio",
    src: "/images/bnp/rider-studio.jpg",
    width: 1600,
    height: 1600,
    titleBn: "স্টুডিও ফিনিশিং ও মেটাল ক্রাফট",
    titleEn: "Studio Precision & Metal Craft",
    tagBn: "০২ / ক্রাফট ডিটেইল",
    tagEn: "02 / CRAFTSMANSHIP DETAIL",
    descBn: "উচ্চ কনট্রাস্ট স্টুডিও ফটোগ্রাফি: হেলমেট ও টু-পিস মেটাল প্লেটের সূক্ষ্ম ফিনিশিং ও টেক্সচার।",
    descEn: "High-contrast studio portrait exploring embossed plate typography, helmet lines and precision metal highlights."
  },
  {
    id: "portrait",
    src: "/images/bnp/rider-portrait.jpg",
    width: 1073,
    height: 1600,
    titleBn: "রাইডার আইডেন্টিটি ও রেসিং প্রোফাইল",
    titleEn: "Rider Identity & Stance Profile",
    tagBn: "০৩ / রাইডার পোর্ট্রেট",
    tagEn: "03 / RIDER PORTRAIT",
    descBn: "ট্যাকটিক্যাল রাইডিং জ্যাকেট ও ওপেন ভাইজার পোর্ট্রেট: মোটরসাইকেলের সাথে রাইডারের ব্যক্তিগত পরিচয়।",
    descEn: "Tactical riding gear portrait balancing rider persona with motorcycle front plate geometry."
  },
  {
    id: "mount",
    src: "/images/bnp/plate-fit-source.jpg",
    width: 1073,
    height: 1600,
    titleBn: "১:১ ফ্রন্ট ফর্ক মাউন্টিং স্টাডি",
    titleEn: "1:1 Front Fork Mounting Fitment",
    tagBn: "০৪ / মাউন্টিং জ্যামিতি",
    tagEn: "04 / FORK MOUNT GEOMETRY",
    descBn: "বাংলাদেশের স্ট্যান্ডার্ড বাইক ও স্কুটারের ফ্রন্ট ফর্কে প্লেট এবং ব্র্যাকেটের নির্ভুল মাপ ও মাউন্টিং অবস্থান।",
    descEn: "Standard front fork mounting perspective verifying bracket clearance and aerodynamic balance."
  }
];

const VALID_PASSCODES = ["Joy1001", typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_LAUNCH_PIN : undefined].filter(Boolean) as string[];

function BNPExperience() {
  const { model, setModel } = useStorefront();
  const { theme, selectTheme, saved } = useStorefrontTheme();
  const [lang, setLang] = useState<Language>("bn"), [step, setStep] = useState(0), [paused, setPaused] = useState(false), [reduced, setReduced] = useState(true), [replay, setReplay] = useState(0), [menu, setMenu] = useState(false);
  const [shopLocked, setShopLocked] = useState(false);
  const [hasChosenPlate, setHasChosenPlate] = useState(false);
  const [heroAtTop, setHeroAtTop] = useState(true);

  // VIP Pre-Launch, Timer, and Lookbook state
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);
  const [isVipUnlocked, setIsVipUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const t = (bn: string, en: string) => lang === "bn" ? bn : en;

  useEffect(() => { const preference = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReduced(preference.matches); update(); preference.addEventListener("change", update); return () => preference.removeEventListener("change", update); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { const update = () => setHeroAtTop(window.scrollY <= 2); update(); window.addEventListener("scroll", update, { passive: true }); return () => window.removeEventListener("scroll", update); }, []);

  // Countdown timer tick in browser environment
  useEffect(() => {
    if (typeof window === "undefined" || typeof (window as any).setInterval !== "function") return;
    const timer = (window as any).setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => {
      if (typeof (window as any).clearInterval === "function") {
        (window as any).clearInterval(timer);
      }
    };
  }, []);

  // Safe check for VIP access in sessionStorage
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? window.sessionStorage?.getItem("bnp_vip_access") : null;
      if (stored === "granted" || stored === "Joy1001") {
        setIsVipUnlocked(true);
      }
    } catch {
      // Storage access may be denied or blocked
    }
  }, []);

  function scrollToSection(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: reduced || paused ? "auto" : "smooth", block: "start" }));
  }
  function studio(next = 1) { if (shopLocked) return; setHasChosenPlate(true); setStep(next); scrollToSection("designer"); setMenu(false); }
  function beginSelection() {
    if (shopLocked) return;
    if (!isVipUnlocked) {
      setPinModalOpen(true);
      scrollToSection("vip-gate");
      setMenu(false);
      return;
    }
    scrollToSection("collection");
    setMenu(false);
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (VALID_PASSCODES.includes(pinInput.trim())) {
      setIsVipUnlocked(true);
      setPinError("");
      setPinModalOpen(false);
      try {
        window.sessionStorage?.setItem("bnp_vip_access", "granted");
      } catch {
        // ignore storage error
      }
    } else {
      setPinError(lang === "bn" ? "ভুল পাসকোড। অনুমোদিত ভিআইপি পাসকোড দিন।" : "Invalid passcode. Please enter the authorized VIP passcode.");
    }
  }

  function handleRelock() {
    setIsVipUnlocked(false);
    setPinInput("");
    setPinError("");
    setPinModalOpen(false);
    try {
      window.sessionStorage?.removeItem("bnp_vip_access");
    } catch {
      // ignore storage error
    }
  }

  const currentPhoto = LOOKBOOK_PHOTOS[selectedPhotoIndex] || LOOKBOOK_PHOTOS[0];

  return <MotionConfig reducedMotion={paused || reduced ? "always" : "user"}><div className="bnp-shop" lang={lang} data-motion={paused || reduced ? "paused" : "active"} data-bnp-appearance={theme}>
    <a className="bn-skip" href="#bnp-main">{t("মূল অংশে যান", "Skip to content")}</a>
    <div className="bn-utility">
      <div className="bn-wrap">
        <span>{t("স্থানীয় নমুনা প্রিভিউ · পেমেন্ট ও ডেলিভারি বুকিং বন্ধ", "LOCAL SAMPLE PREVIEW · PAYMENT & DISPATCH DISABLED")}</span>
        <div className="bn-display-controls">
          {isVipUnlocked ? (
            <span className="bn-vip-pill active">
              <ShieldCheck size={12}/>
              <span>{t("ভিআইপি সক্রিয়", "VIP ACTIVE")}</span>
              <button type="button" onClick={handleRelock} aria-label={t("লক করুন", "Lock VIP")}>
                <Lock size={9}/>{t("লক", "Lock")}
              </button>
            </span>
          ) : (
            <a href="#vip-gate" className="bn-vip-pill locked">
              <Lock size={11}/>
              <span>{t("অ্যাডমিন পিন গেট", "ADMIN PIN GATE")}</span>
            </a>
          )}
          <label>
            <span className="bn-sr">{t("BNP-এর চেহারা", "BNP appearance")}</span>
            <select value={theme} onChange={e => selectTheme(e.target.value as "classic" | "motorsport")} aria-label={t("BNP-এর চেহারা", "BNP appearance")}>
              <option value="motorsport">{t("মোটরস্পোর্ট", "Motorsport")}</option>
              <option value="classic">{t("ক্লাসিক কার্বন", "Classic Carbon")}</option>
            </select>
          </label>
          <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Resume motion" : "Pause motion"}>
            {paused || reduced ? <Play size={12}/> : <Pause size={12}/>}
            <span>{paused ? t("চালু", "Resume") : t("মোশন", "Motion")}</span>
          </button>
        </div>
      </div>
      {!saved && <p role="status">{t("এই ভিজিটের জন্য চেহারা বদলেছে; অর্ডারের তথ্য অপরিবর্তিত।", "Appearance changed for this visit; your order details are unchanged.")}</p>}
    </div>
    <header className="bn-header">
      {theme === "motorsport" && heroAtTop && <div className="bn-helmet-depth" aria-hidden="true"><img src="/images/bnp/rider-night.jpg" width="1073" height="1600" alt=""/></div>}
      <div className="bn-wrap bn-nav">
        <a href="/bnp" className="bn-logo" aria-label="BNP Bike Number Plate">B<span>N</span>P<small>BIKE NUMBER PLATE</small></a>
        <nav aria-label={t("প্রধান নেভিগেশন", "Main navigation")}>
          <a href="#pre-launch">{t("লুকবুক ও টাইমার", "Lookbook & Timer")}</a>
          <a href="#collection">{t("প্লেট বাছাই", "Shop plates")}</a>
          <a href="#how-it-works">{t("যেভাবে অর্ডার করবেন", "How it works")}</a>
          <a href="#tracking">{t("ট্র্যাকিং", "Tracking")}</a>
        </nav>
        <div className="bn-nav-actions">
          <button
            type="button"
            className={`bn-nav-lock ${isVipUnlocked ? "unlocked" : "locked"}`}
            onClick={() => isVipUnlocked ? handleRelock() : setPinModalOpen(true)}
            aria-label={isVipUnlocked ? t("ভিআইপি আনলকড, লক করুন", "VIP Unlocked, click to lock") : t("স্টুডিও লকড, পিন দিন", "Studio Locked, click to enter PIN")}
          >
            {isVipUnlocked ? <Unlock size={13} color="#52c41a" /> : <Lock size={13} color="#ff4b5c" />}
            <span>{isVipUnlocked ? t("আনলক", "UNLOCKED") : t("লক (PIN)", "LOCKED")}</span>
          </button>
          <button className="bn-language" onClick={() => setLang(lang === "bn" ? "en" : "bn")} aria-label={lang === "bn" ? "Switch to English" : "Switch to Bangla"}>
            <span className={lang === "bn" ? "active" : ""}>BN / বাংলা</span>
            <i/>
            <span className={lang === "en" ? "active" : ""}>EN</span>
          </button>
          <button className="bn-button bn-nav-cta" disabled={shopLocked} onClick={beginSelection}>
            {isVipUnlocked ? t("প্লেট তৈরি করুন", "Customize yours") : t("ভিআইপি আনলক", "VIP Unlock")}<ArrowUpRight size={17}/>
          </button>
          <button className="bn-menu-button" aria-expanded={menu} aria-controls="bn-mobile-menu" aria-label={t("মেনু খুলুন", "Open menu")} onClick={() => setMenu(!menu)}>
            {menu ? <X/> : <Menu/>}
          </button>
        </div>
      </div>
      {menu && <nav id="bn-mobile-menu" className="bn-mobile-menu">
        <a href="#pre-launch" onClick={() => setMenu(false)}>{t("লুকবুক ও টাইমার", "Lookbook & Timer")}</a>
        <a href="#collection" onClick={() => setMenu(false)}>{t("প্লেট বাছাই", "Shop plates")}</a>
        <a href="#tracking" onClick={() => setMenu(false)}>{t("ট্র্যাকিং ও সহায়তা", "Tracking and help")}</a>
        <a href="/vespa">{t("ভিন্টেজ নামপ্লেট দোকান", "Vintage nameplate shop")}</a>
      </nav>}
    </header>
    <main id="bnp-main">
      {theme === "classic" && <div className="bn-retained-classic"><Hero designTarget={hasChosenPlate || shopLocked ? "#designer" : "#collection"} /></div>}
      <section hidden={theme === "classic"} className="bn-hero" aria-labelledby="bn-title">
        <div className="bn-hero-atmosphere" aria-hidden="true"/>
        <div className="bn-hero-rider"><img src="/images/bnp/rider-night.jpg" alt="Original BNP photograph: helmeted woman rider holding her number plate beside a red motorcycle in a lit tunnel." width="1073" height="1600" fetchPriority="high"/></div>
        <div className="bn-hero-shade" aria-hidden="true"/>
        <div className="bn-wrap bn-hero-copy">
          <motion.p initial={false} className="bn-eyebrow"><span/>BNP / BIKE NUMBER PLATE</motion.p>

          <div className="bn-hero-lock-status">
            {isVipUnlocked ? (
              <div className="bn-hero-lock-pill unlocked">
                <Unlock size={14}/>
                <span>{t("ভিআইপি স্টুডিও সক্রিয়", "VIP ATELIER ACCESS ACTIVE")}</span>
                <button type="button" onClick={handleRelock}>{t("লক করুন", "Lock Gate")}</button>
              </div>
            ) : (
              <div className="bn-hero-lock-pill locked">
                <Lock size={14} className="bn-pulse-icon"/>
                <span>{t("প্রি-লঞ্চ মোড · অ্যাডমিন পাসকোড প্রয়োজন", "PRE-LAUNCH MODE · GATED BY ADMIN PASS")}</span>
                <button type="button" onClick={() => setPinModalOpen(true)}>{t("পাসকোড দিন", "Enter Passcode")}</button>
              </div>
            )}
          </div>

          <div className="bn-hero-countdown-pill" role="timer" aria-label={t("কাউন্টডাউন", "Countdown")}>
            <Clock size={14}/>
            <span>{t("লঞ্চ বাকি:", "Launch in:")}</span>
            <strong>{lang === "bn" ? toBanglaDigits(timeLeft.days) : String(timeLeft.days).padStart(2, "0")}{t("দিন", "d")} : {lang === "bn" ? toBanglaDigits(String(timeLeft.hours).padStart(2, "0")) : String(timeLeft.hours).padStart(2, "0")}{t("ঘ", "h")} : {lang === "bn" ? toBanglaDigits(String(timeLeft.minutes).padStart(2, "0")) : String(timeLeft.minutes).padStart(2, "0")}{t("মি", "m")} : {lang === "bn" ? toBanglaDigits(String(timeLeft.seconds).padStart(2, "0")) : String(timeLeft.seconds).padStart(2, "0")}{t("সে", "s")}</strong>
          </div>

          <motion.h1 id="bn-title" initial={paused || reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: paused || reduced ? 0 : .6 }}>
            {lang === "bn" ? <>আপনার রাইড।<br/><em>আপনার স্বাক্ষর।</em></> : <>YOUR RIDE.<br/>YOUR<br/><em>SIGNATURE.</em></>}
          </motion.h1>
          <p className="bn-hero-tag">YOUR RIDE. OUR PRECISION.</p>
          <p className="bn-hero-description">
            {t("বাইক বা স্কুটারের ফ্রন্ট প্লেট বেছে নিন।", "Choose a front plate for your motorcycle or scooter.")}<br/>
            {t("নিজের তথ্য দিন, তারপর অর্ডার পর্যালোচনা করুন।", "Add your details. Review every finishing touch.")}
          </p>
          <button className="bn-button" disabled={shopLocked} onClick={beginSelection}>
            {isVipUnlocked ? (
              <>{t("প্লেট তৈরি করুন", "Customize your plate")}<ArrowUpRight size={22}/></>
            ) : (
              <><Lock size={18}/> {t("ভিআইপি স্টুডিও আনলক করুন", "Unlock Studio with Passcode")}<ArrowRight size={18}/></>
            )}
          </button>
          <a className="bn-hero-explore" href="#pre-launch">
            {t("📸 ছবির লুকবুক ও টাইমার", "📸 View Photo Lookbook & Timer")}<ArrowDown size={18}/>
          </a>
          <span className="bn-hero-index">01 / THE BNP COLLECTION</span>
        </div>
        <span className="bn-hero-credit">ORIGINAL BNP PHOTOGRAPHY</span>
      </section>

      <section className="bn-signature-ticker" aria-label="Your ride. Your signature. Your BNP. BNP with Lorapok Labs.">
        <div className="bn-signature-window"><div className="bn-signature-track">{[0,1].map(group => <div className="bn-signature-group" key={group}>{[0,1].map(copy => <span key={copy} aria-hidden={group !== 0 || copy !== 0}>YOUR RIDE <b aria-hidden="true">↗</b> YOUR SIGNATURE <b aria-hidden="true">↗</b> YOUR BNP <b aria-hidden="true">↗</b> <a href="https://lorapok.tech/" tabIndex={group === 0 && copy === 0 ? 0 : -1}>BNP × LORAPOK LABS</a> <b aria-hidden="true">↗</b></span>)}</div>)}</div></div>
        <button type="button" className="bn-signature-pause" onClick={() => setPaused(!paused)} disabled={reduced} aria-pressed={paused || reduced} aria-label={paused ? t("স্ক্রলার চালু করুন", "Resume signature scroller") : t("স্ক্রলার থামান", "Pause signature scroller")}>{paused || reduced ? <Play size={15}/> : <Pause size={15}/>}<span>{reduced ? t("স্থির", "Static") : paused ? t("চালু", "Resume") : t("থামান", "Pause")}</span></button>
      </section>

      {/* Pre-Launch VIP Exhibition, Professional Countdown Timer, & Only Pic Entry Lookbook */}
      <section id="pre-launch" className="bn-prelaunch-section" aria-labelledby="prelaunch-title">
        <div className="bn-wrap">
          <div className="bn-prelaunch-header">
            <p className="bn-eyebrow"><span/>00 / {t("প্রি-লঞ্চ ভিআইপি প্রদর্শনী", "PRE-LAUNCH VIP EXHIBITION")}</p>
            <h2 id="prelaunch-title">{t("পাবলিক লঞ্চের বাকি সময় ও আসল ছবির গ্যালারি।", "LAUNCH COUNTDOWN & ATELIER LOOKBOOK.")}</h2>
            <p>{t("অ্যাডমিনের অনুমোদন সাপেক্ষে সাধারণ বাণিজ্যিক অর্ডার গ্রহণ শুরু হবে। ততদিন পর্যন্ত আসল মোটরসাইকেল ও প্লেটের লুকবুক দেখুন, অথবা অনুমোদিত ৬ ডিজিটের ভিআইপি পিন দিয়ে স্টুডিও আনলক করুন।", "Public commercial intake will begin once official admin clearance is released. Until then, explore authentic photography from our atelier lookbook below, or enter the authorized 6-digit VIP PIN to test the studio.")}</p>
          </div>

          {/* Professional Countdown Timer */}
          <div className="bn-countdown-wrapper" role="timer" aria-label={t("লঞ্চ কাউন্টডাউন টাইমার", "Launch Countdown Timer")}>
            <div className="bn-countdown-header">
              <span className="bn-timer-pulse" aria-hidden="true" />
              <Clock size={16} />
              <span>{t("অফিশিয়াল পাবলিক লঞ্চের কাউন্টডাউন", "OFFICIAL PUBLIC LAUNCH COUNTDOWN")}</span>
              <span className="bn-timer-badge">{t("অ্যাডমিন অনুমোদন পেন্ডিং", "ADMIN CLEARANCE PENDING")}</span>
            </div>
            <div className="bn-timer-grid">
              <div className="bn-timer-card">
                <span className="bn-timer-val">{lang === "bn" ? toBanglaDigits(timeLeft.days) : String(timeLeft.days).padStart(2, "0")}</span>
                <span className="bn-timer-lbl">{t("দিন", "DAYS")}</span>
              </div>
              <span className="bn-timer-sep" aria-hidden="true">:</span>
              <div className="bn-timer-card">
                <span className="bn-timer-val">{lang === "bn" ? toBanglaDigits(String(timeLeft.hours).padStart(2, "0")) : String(timeLeft.hours).padStart(2, "0")}</span>
                <span className="bn-timer-lbl">{t("ঘণ্টা", "HOURS")}</span>
              </div>
              <span className="bn-timer-sep" aria-hidden="true">:</span>
              <div className="bn-timer-card">
                <span className="bn-timer-val">{lang === "bn" ? toBanglaDigits(String(timeLeft.minutes).padStart(2, "0")) : String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className="bn-timer-lbl">{t("মিনিট", "MINUTES")}</span>
              </div>
              <span className="bn-timer-sep" aria-hidden="true">:</span>
              <div className="bn-timer-card highlight">
                <span className="bn-timer-val">{lang === "bn" ? toBanglaDigits(String(timeLeft.seconds).padStart(2, "0")) : String(timeLeft.seconds).padStart(2, "0")}</span>
                <span className="bn-timer-lbl">{t("সেকেন্ড", "SECONDS")}</span>
              </div>
            </div>
            <p className="bn-fine bn-timer-note">{t("কাউন্টডাউন শেষ হলে ও অ্যাডমিন সম্মতি দিলে পেমেন্ট ও দেশব্যাপী ডেলিভারি চালু হবে।", "Online payment, automated manufacturing and courier dispatch activate upon official admin clearance.")}</p>
          </div>

          {/* Only Pic Entry Lookbook */}
          <div className="bn-lookbook" id="lookbook" aria-label={t("বিএনপি অফিসিয়াল ফটোগ্রাফি প্রদর্শনী", "BNP Official Photography Lookbook")}>
            <div className="bn-lookbook-top">
              <div>
                <span className="bn-eyebrow"><Camera size={13}/> {t("আসল ছবির এন্ট্রি · শুধুমাত্র ছবি প্রদর্শন", "CURATED PHOTOGRAPHY · AUTHENTIC ASSET ENTRY")}</span>
                <h3>{lang === "bn" ? currentPhoto.titleBn : currentPhoto.titleEn}</h3>
                <p>{lang === "bn" ? currentPhoto.descBn : currentPhoto.descEn}</p>
              </div>
              <button type="button" className="bn-button bn-outline bn-inspect-btn" onClick={() => setLightboxOpen(true)}>
                <Eye size={16}/> {t("বড় আকারে দেখুন", "Inspect 1:1")}
              </button>
            </div>
            <div className="bn-lookbook-stage">
              <div className="bn-lookbook-featured">
                <img src={currentPhoto.src} alt={lang === "bn" ? currentPhoto.titleBn : currentPhoto.titleEn} width={currentPhoto.width} height={currentPhoto.height} loading="lazy" />
                <div className="bn-lookbook-badge">
                  <span>{lang === "bn" ? currentPhoto.tagBn : currentPhoto.tagEn}</span>
                  <small>100% VERIFIED BNP ARCHIVE</small>
                </div>
              </div>
              <div className="bn-lookbook-nav" role="tablist" aria-label={t("ফটোগ্রাফি বাছাই", "Choose photograph")}>
                {LOOKBOOK_PHOTOS.map((photo, idx) => (
                  <button
                    type="button"
                    key={photo.id}
                    role="tab"
                    aria-selected={selectedPhotoIndex === idx}
                    className={`bn-lookbook-thumb ${selectedPhotoIndex === idx ? "active" : ""}`}
                    onClick={() => setSelectedPhotoIndex(idx)}
                  >
                    <img src={photo.src} alt="" width={70} height={70} />
                    <div>
                      <strong>{lang === "bn" ? photo.tagBn : photo.tagEn}</strong>
                      <span>{lang === "bn" ? photo.titleBn : photo.titleEn}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* VIP PIN Gate Card */}
          <div className="bn-vip-gate-card" id="vip-gate">
            <div className="bn-vip-gate-info">
              <div className="bn-vip-icon">
                {isVipUnlocked ? <Unlock size={24} color="#52c41a" /> : <Lock size={24} color="#ed1b2f" />}
              </div>
              <div>
                <h3>{isVipUnlocked ? t("ভিআইপি স্টুডিও আনলক সম্পন্ন", "VIP Atelier Studio Unlocked") : t("অ্যাডমিন / ভিআইপি পাসকোড এন্ট্রি", "Admin / VIP Passcode Access")}</h3>
                <p>
                  {isVipUnlocked
                    ? t("আপনার ভিআইপি অ্যাক্সেস সক্রিয় রয়েছে। নিচের প্লেট কালেকশন থেকে যে কোনো ফরম্যাট বেছে কাস্টমাইজেশন করুন।", "VIP access is active for this session. Choose a plate format below to customize details.")
                    : t("পাবলিক অর্ডার ইনটেক এখনও অ্যাডমিন দ্বারা অনুমোদিত হয়নি। স্টুডিও ও কাস্টমাইজেশন প্রিভিউ দেখতে অনুমোদিত ভিআইপি পাসকোড দিন।", "Commercial ordering has not been released by the admin yet. Enter authorized VIP passcode to unlock the studio.")}
                </p>
              </div>
            </div>
            {isVipUnlocked ? (
              <div className="bn-vip-unlocked-actions">
                <button type="button" className="bn-button" onClick={() => scrollToSection("collection")}>
                  {t("প্লেট বাছাই করুন", "Select Plate Format")} <ArrowRight size={17} />
                </button>
                <button type="button" className="bn-button bn-outline" onClick={handleRelock}>
                  <Lock size={15} /> {t("পুনরায় লক করুন", "Re-lock Gate")}
                </button>
              </div>
            ) : (
              <form className="bn-pin-form" onSubmit={handlePinSubmit}>
                <div className="bn-pin-input-group">
                  <KeyRound size={17} className="bn-pin-key-icon" />
                  <input
                    type="password"
                    maxLength={30}
                    placeholder={t("ভিআইপি পাসকোড লিখুন", "Enter VIP passcode")}
                    value={pinInput}
                    onChange={e => { setPinInput(e.target.value); if (pinError) setPinError(""); }}
                    aria-label={t("ভিআইপি পাসকোড", "VIP Passcode")}
                  />
                  <button type="submit" className="bn-button bn-pin-submit">
                    {t("আনলক করুন", "Unlock Studio")} <ArrowRight size={17} />
                  </button>
                </div>
                {pinError && <p className="bn-pin-error" role="alert">{pinError}</p>}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="bn-lightbox-overlay" role="dialog" aria-modal="true" aria-label={lang === "bn" ? currentPhoto.titleBn : currentPhoto.titleEn} onClick={() => setLightboxOpen(false)}>
          <div className="bn-lightbox-content" onClick={e => e.stopPropagation()}>
            <button type="button" className="bn-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label={t("বন্ধ করুন", "Close")}>
              <X size={20} />
            </button>
            <img src={currentPhoto.src} alt={lang === "bn" ? currentPhoto.titleBn : currentPhoto.titleEn} width={currentPhoto.width} height={currentPhoto.height} />
            <div className="bn-lightbox-caption">
              <h4>{lang === "bn" ? currentPhoto.titleBn : currentPhoto.titleEn}</h4>
              <p>{lang === "bn" ? currentPhoto.descBn : currentPhoto.descEn}</p>
              <span className="bn-fine">Original resolution: {currentPhoto.width} × {currentPhoto.height} px · Authentic BNP Photography</span>
            </div>
          </div>
        </div>
      )}

      <div className="bn-journey-strip"><div className="bn-wrap">{[t("প্লেট বাছাই", "CHOOSE YOUR PLATE"),t("তথ্য দিন", "ADD YOUR DETAILS"),t("মোট দেখুন", "CHECK YOUR TOTAL"),t("অর্ডার", "REVIEW & REQUEST")].map((s,i) => <span key={s}><b>0{i+1}</b>{s}{i<3 && <ArrowRight size={15}/>}</span>)}</div></div>

      <section id="collection" className="bn-collection bn-section" aria-labelledby="collection-title">
        <div className="bn-wrap">
          <div className="bn-section-top">
            <div>
              <p className="bn-eyebrow">01 / {t("আপনার প্লেট", "THE COLLECTION")}</p>
              <h2 id="collection-title">{t("আপনার রাইডের জন্য।", "FIND YOUR FIT.")}</h2>
            </div>
            <a href="#collection" className="bn-text-link">{t("নিজের মতো তৈরি করুন", "Make it yours")}<ArrowUpRight size={18}/></a>
          </div>
          <div className="bn-products">
            {(["A","B"] as const).map((m,i) => (
              <button
                type="button"
                key={m} disabled={shopLocked}
                aria-label={m === "A" ? t("মোটরসাইকেল ফ্রন্ট প্লেট বেছে তথ্য দিন", "Choose motorcycle front plate and customize") : t("স্কুটার ফ্রন্ট প্লেট বেছে তথ্য দিন", "Choose scooter front plate and customize")}
                aria-pressed={(hasChosenPlate || shopLocked) && model === m}
                className={`bn-product ${(hasChosenPlate || shopLocked) && model === m ? "selected" : ""}`}
                onClick={() => { setModel(m); studio(1); }}
              >
                <div className="bn-product-heading">
                  <div>
                    <h3>{m === "A" ? t("মোটরসাইকেল ফ্রন্ট প্লেট", "Motorcycle front plate") : t("স্কুটার ফ্রন্ট প্লেট", "Scooter front plate")}</h3>
                    <span>{m === "A" ? "MOTORCYCLE FRONT" : "SCOOTER FRONT"}</span>
                    <small>{m === "A" ? "285 × 50 mm" : "200 × 100 mm"} · {t("প্রিভিউ", "PREVIEW")}</small>
                  </div>
                  <i>{(hasChosenPlate || shopLocked) && model === m ? <Check size={17}/> : `0${i+1}`}</i>
                </div>
                <div className="bn-product-art">
                  <Plate model={m} motionDisabled={paused || reduced} region={m === "A" ? "ঢাকা মেট্রো" : "কুমিল্লা"} digits={m === "A" ? "১২৩৪৫৬" : "১১০০৫২"}/>
                </div>
                <span className="bn-product-choose">
                  {(hasChosenPlate || shopLocked) && model === m ? t("নির্বাচিত", "Selected") : t("বাছাই করুন", "Choose format")}
                  {(hasChosenPlate || shopLocked) && model === m ? <Check size={18}/> : <ArrowRight size={18}/>}
                </span>
              </button>
            ))}
          </div>
          <p className="bn-fine">{t("দুটিই সামনের প্লেটের নমুনা ফরম্যাট। মাপ, ফিট, উপকরণ ও বর্তমান নিয়ম যাচাই করা বাকি।", "Both are illustrative front-plate formats. Dimensions, fit, materials and current requirements still need verification.")}</p>
        </div>
      </section>

      <div className="bn-order-reveal" hidden={!hasChosenPlate && !shopLocked}>
        {!isVipUnlocked && !shopLocked && (
          <div className="bn-studio-gate-banner" role="status">
            <div className="bn-gate-banner-left">
              <div className="bn-lock-circle">
                <Lock size={18} color="#ff4b5c" />
              </div>
              <div>
                <strong>{t("🔒 স্টুডিও বর্তমানে পাসকোড দ্বারা লকড (প্রিভিউ মোড)", "🔒 Studio Gated by Passcode (Preview Mode)")}</strong>
                <p>{t("সম্পূর্ণ কাস্টমাইজেশন ও অর্ডার সাবমিশনের জন্য অনুমোদিত পাসকোড প্রয়োজন।", "Full customization and request submission require authorized VIP passcode clearance.")}</p>
              </div>
            </div>
            <button type="button" className="bn-button bn-outline bn-pin-jump" onClick={() => setPinModalOpen(true)}>
              <KeyRound size={14} /> {t("পাসকোড দিন", "Enter Passcode")}
            </button>
          </div>
        )}
        <BNPOrderStudio lang={lang} step={step} setStep={setStep} onLockChange={setShopLocked} motionDisabled={paused || reduced}/>
      </div>

      <section id="how-it-works" className="bn-process bn-section" aria-labelledby="bn-next-title">
        <div className="bn-wrap bn-process-grid">
          <div>
            <p className="bn-eyebrow">03 / {t("অনুরোধের পর", "AFTER YOUR REQUEST")}</p>
            <h2 id="bn-next-title">{t("পাঠানোর পর কী হবে?", "WHAT HAPPENS NEXT?")}</h2>
            <p className="bn-process-intro">{t("এটি নমুনা অনুরোধের প্রিভিউ। এখনই কেনাকাটা বা ডেলিভারি নিশ্চিত হয় না।", "This preview records sample requests. It does not confirm a purchase or delivery.")}</p>
            <ol className="bn-next-steps">
              <li><span>01</span><div><h3>{t("রেফারেন্সটি রাখুন", "Keep your reference")}</h3><p>{t("অনুরোধ সংরক্ষিত হলে রেফারেন্স ও নমুনা মোট দেখবেন। কোনো টাকা নেওয়া হবে না।", "A recorded request shows a reference and sample total. No payment is collected.")}</p></div></li>
              <li><span>02</span><div><h3>{t("একই ট্যাবে অবস্থা দেখুন", "Check the same request")}</h3><p>{t("নিশ্চিতকরণ অংশে অনুরোধের সর্বশেষ অবস্থা দেখা যাবে, সেবাটি উপলভ্য থাকলে। এটি কুরিয়ার ট্র্যাকিং নয়।", "Use the status button on your confirmation when the service is available. This is not courier tracking.")}</p></div></li>
              <li><span>03</span><div><h3>{t("বাস্তব অর্ডার এখন বন্ধ", "Real orders are not open")}</h3><p>{t("পেমেন্ট, তৈরি ও কুরিয়ার বুকিং চালু হয়নি। ডেলিভারির তারিখও নিশ্চিত করা হয়নি।", "Payment, production and courier booking are disabled. No delivery date is confirmed.")}</p></div></li>
            </ol>
          </div>
          <div id="tracking" className="bn-tracking" aria-labelledby="bn-tracking-title">
            <Package size={26} aria-hidden="true"/>
            <h3 id="bn-tracking-title">{t("অনুরোধের অবস্থা ও ডেলিভারি", "REQUEST STATUS & DELIVERY")}</h3>
            <p className="bn-tracking-availability">{t("কুরিয়ার ট্র্যাকিং চালু হয়নি", "Courier tracking is not available")}</p>
            <p>{t("নমুনা অনুরোধ সংরক্ষণ মানেই প্লেট তৈরি বা পাঠানো নয়। আপনার নিশ্চিতকরণে শুধু অনুরোধের অবস্থা দেখুন।", "A saved sample request does not mean a plate is being made or shipped. Your confirmation shows request status only.")}</p>
            <p className="bn-fine">{t("ফল অনিশ্চিত হলে একই ট্যাবের ‘আগের অনুরোধ আবার পরীক্ষা’ ব্যবহার করুন। নতুন করে পাঠাবেন না।", "If submission was interrupted, use ‘Retry original request’ in the same tab. Do not submit a new request.")}</p>
            {shopLocked ? <a className="bn-button bn-outline" href="#designer">{t("আমার অনুরোধে ফিরুন", "Return to my request")}<ArrowRight size={18}/></a> : <a className="bn-text-link" href="#faq">{t("অনুরোধের প্রশ্নোত্তর", "Read request FAQs")}<ArrowRight size={18}/></a>}
          </div>
        </div>
      </section>

      <section className="bn-editorial" aria-labelledby="bn-editorial-title">
        <img src="/images/bnp/rider-night.jpg" width="1073" height="1600" loading="lazy" alt="Original BNP rider photography, helmet and blue racing shirt against the tunnel lights."/>
        <div>
          <p className="bn-eyebrow">THE BNP DETAIL</p>
          <h2 id="bn-editorial-title">{t("প্রতিটি রাইডে", "BUILT AROUND")}<br/><em>{t("নিজস্ব পরিচয়।", "YOUR RIDE.")}</em></h2>
          <p>{t("শেষের ছোট্ট ছোঁয়া। পুরোপুরি আপনার।", "The finishing touch. The personal detail.")}</p>
        </div>
        <span aria-hidden="true"/>
      </section>

      <section className="bn-material-chapter">
        <CinematicMaterial paused={paused} reduced={reduced} replay={replay}/>
        <div className="bn-wrap">
          <p className="bn-eyebrow">04 / MATERIAL IN MOTION</p>
          <h2>{t("আলোয় ফুটে ওঠে", "PRECISION,")}<br/><em>{t("প্রতিটি রেখা।", "IN EVERY REFLECTION.")}</em></h2>
          <p>{t("কার্বন, ধাতু আর লাল আলোর সিনেমাটিক স্টাডি। এটি নকশার উপস্থাপনা, বাস্তব পণ্যের উপকরণের দাবি নয়।", "The original cinematic study of carbon, metal and red light. A design study, not a claim about the finished product’s material.")}</p>
          <button type="button" className="bn-text-link" disabled={reduced} onClick={() => { setPaused(false); setReplay(replay+1); }}>
            <RotateCcw size={15}/>
            {reduced ? t("কম মোশনে স্থির ছবি", "Static image for reduced motion") : t("সিনেমাটিক স্টাডি আবার দেখুন", "Replay cinematic study")}
          </button>
        </div>
      </section>

      <section id="faq" className="bn-faq bn-section">
        <div className="bn-wrap">
          <p className="bn-eyebrow">05 / {t("সহায়তা", "GOOD TO KNOW")}</p>
          <h2>{t("অনুরোধের আগে জেনে নিন।", "BEFORE YOU REQUEST.")}</h2>
          {[[t("বাইক ও স্কুটার প্লেটের পার্থক্য কী?", "How do the two front formats differ?"),t("একটি এক লাইনের, অন্যটি দুই লাইনের প্রিভিউ। দেখানো মাপ নমুনা; আপনার রাইডে ফিট ও প্রযোজ্য নিয়ম উৎপাদনের আগে নিশ্চিত করতে হবে।", "One is a single-line preview, the other two-line. Illustrated dimensions, vehicle fit and applicable rules must be confirmed before manufacture.")],[t("অর্ডারের আগে কোন তথ্য লাগবে?", "What details are needed before requesting?"),t("ফরম্যাট, বিদ্যমান নিবন্ধনের অক্ষর ও সংখ্যা, পরিমাণ এবং ডেলিভারির তথ্য। এই স্থানীয় প্রিভিউতে শুধু নমুনা তথ্য দিন; কোনো নথি আপলোড করবেন না।", "Your format, existing registration text, quantity and delivery details. Use sample information in this local preview and do not upload documents.")],[t("এখন কি পেমেন্ট বা Pathao বুকিং হবে?", "Will this collect payment or book Pathao?"),t("না। নমুনা অনুরোধ গ্রহণ চালু থাকলে শুধু সেটিই সংরক্ষিত হবে। টাকা নেওয়া, প্লেট তৈরি ও কুরিয়ার বুকিং বন্ধ।", "No. When sample intake is available, only a sample request is recorded. Payment, production and courier booking remain disabled.")],[t("চেহারা বা ভাষা বদলালে তথ্য থাকবে?", "Will changing appearance or language keep my details?"),t("হ্যাঁ, একই পৃষ্ঠায় চেহারা ও ভাষা বদলালেও খসড়াটি থাকবে। পাঠানোর ফল অনিশ্চিত হলে একই ট্যাবে আগের অনুরোধ আবার পরীক্ষা করুন; নতুন করে পাঠাবেন না।", "Yes. Your draft stays while changing appearance or language on this page. If submission is interrupted, retry the original request in the same tab; do not create another one.")]].map(([q,a]) => (
            <details key={q}>
              <summary>{q}<span>+</span></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bn-brand-guide bn-wrap">
        <img src="/images/mascot/concierge.png" width="120" height="120" alt="Lorapok Labs guide mascot" loading="lazy"/>
        <div>
          <span className="bn-eyebrow">A LORAPOK LABS EXPERIENCE</span>
          <h3>{t("প্রতিটি ধাপে, পাশে।", "A little guidance. Every step.")}</h3>
          <p>{t("ফরম্যাট বেছে নিন, আপনার নম্বরের প্রিভিউ দেখুন, তারপর নমুনা অনুরোধটি যাচাই করুন।", "Choose a format, preview your plate text and review your sample request.")}</p>
        </div>
        <a href="/vespa" className="bn-text-link">{t("ভিন্টেজ নামপ্লেট দোকান", "Vintage nameplate shop")}<ArrowUpRight size={18}/></a>
      </section>
    </main>

    <footer className="bn-footer">
      <div className="bn-wrap">
        <a href="/bnp" className="bn-logo">B<span>N</span>P<small>BIKE NUMBER PLATE</small></a>
        <p>A Joy & Arash Enterprise venture.<br/>{t("স্থানীয় নকশা ও নমুনা অনুরোধের প্রিভিউ।", "Local design and sample-request preview.")}</p>
        <img src="/images/themes/lorapok-labs.svg" width="130" height="35" alt="Lorapok Labs"/>
        <a href="#bnp-main">{t("উপরে যান", "Back to top")} ↑</a>
      </div>
    </footer>

    {/* Floating Lock Quick-Bar */}
    <div className="bn-floating-lock">
      <button
        type="button"
        className={`bn-floating-lock-btn ${isVipUnlocked ? "unlocked" : "locked"}`}
        onClick={() => isVipUnlocked ? handleRelock() : setPinModalOpen(true)}
      >
        {isVipUnlocked ? <Unlock size={16} /> : <Lock size={16} className="bn-pulse-icon" />}
        <span>{isVipUnlocked ? t("ভিআইপি সক্রিয় (লক)", "VIP ACTIVE (LOCK)") : t("স্টুডিও লকড · পাসকোড দিন", "STUDIO LOCKED · ENTER PASS")}</span>
      </button>
    </div>

    {/* Quick PIN Modal */}
    {pinModalOpen && (
      <div className="bn-pin-modal-overlay" role="dialog" aria-modal="true" aria-label={t("ভিআইপি স্টুডিও আনলক", "Unlock VIP Atelier")} onClick={() => setPinModalOpen(false)}>
        <div className="bn-pin-modal-content" onClick={e => e.stopPropagation()}>
          <button type="button" className="bn-pin-modal-close" onClick={() => setPinModalOpen(false)} aria-label={t("বন্ধ করুন", "Close")}>
            <X size={20} />
          </button>
          <div className="bn-pin-modal-header">
            <div className="bn-lock-circle" style={{ margin: "0 auto 12px" }}>
              <Lock size={22} color="#ed1b2f" />
            </div>
            <h3>{t("ভিআইপি স্টুডিও পাসকোড এন্ট্রি", "VIP Atelier Passcode")}</h3>
            <p>{t("অ্যাডমিনের আনুষ্ঠানিক নির্দেশ সাপেক্ষে সাধারণ অর্ডার শুরু হবে। প্রি-লঞ্চ স্টুডিও আনলক করতে অনুমোদিত ভিআইপি পাসকোড দিন।", "Public order intake is restricted pending admin clearance. Enter authorized VIP passcode to unlock the studio.")}</p>
          </div>
          <form className="bn-pin-form" onSubmit={handlePinSubmit}>
            <div className="bn-pin-input-group">
              <KeyRound size={17} className="bn-pin-key-icon" />
              <input
                type="password"
                maxLength={30}
                autoFocus
                placeholder={t("ভিআইপি পাসকোড লিখুন", "Enter VIP passcode")}
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); if (pinError) setPinError(""); }}
                aria-label={t("ভিআইপি পাসকোড", "VIP Passcode")}
              />
              <button type="submit" className="bn-button bn-pin-submit">
                {t("আনলক করুন", "Unlock")} <ArrowRight size={16} />
              </button>
            </div>
            {pinError && <p className="bn-pin-error" role="alert">{pinError}</p>}
          </form>
        </div>
      </div>
    )}
  </div></MotionConfig>;
}

export default function BNPStorefront() { return <StorefrontProvider><StorefrontThemeProvider defaultTheme="motorsport"><BNPExperience/></StorefrontThemeProvider></StorefrontProvider>; }
