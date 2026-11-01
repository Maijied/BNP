/**
 * Bengali Transliteration & Plate Normalization Engine
 * Converts English phonetic vehicle registration inputs to official BRTA Bangla typography.
 */

export const DIGIT_MAP: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

export const BANGLA_DIGIT_MAP: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

export const DISTRICT_MAP: Record<string, string> = {
  // Metropolitans
  "dhaka metro": "ঢাকা মেট্রো",
  "dm": "ঢাকা মেট্রো",
  "chattogram metro": "চট্টগ্রাম মেট্রো",
  "ctg metro": "চট্টগ্রাম মেট্রো",
  "chittagong metro": "চট্টগ্রাম মেট্রো",
  "sylhet metro": "সিলেট মেট্রো",
  "rajshahi metro": "রাজশাহী মেট্রো",
  "khulna metro": "খুলনা মেট্রো",
  "barishal metro": "বরিশাল মেট্রো",
  "rangpur metro": "রংপুর মেট্রো",
  "gazipur metro": "গাজীপুর মেট্রো",

  // Districts
  "dhaka": "ঢাকা",
  "chattogram": "চট্টগ্রাম",
  "chittagong": "চট্টগ্রাম",
  "cumilla": "কুমিল্লা",
  "comilla": "কুমিল্লা",
  "gazipur": "গাজীপুর",
  "narayanganj": "নারায়ণগঞ্জ",
  "sylhet": "সিলেট",
  "rajshahi": "রাজশাহী",
  "khulna": "খুলনা",
  "barishal": "বরিশাল",
  "rangpur": "রংপুর",
  "mymensingh": "ময়মনসিংহ",
  "bogura": "বগুড়া",
  "bogra": "বগুড়া",
  "noakhali": "নোয়াখালী",
  "feni": "ফেনী",
  "brahmanbaria": "ব্রাহ্মণবাড়িয়া",
  "b-baria": "ব্রাহ্মণবাড়িয়া",
  "chandpur": "চাঁদপুর",
  "cox's bazar": "কক্সবাজার",
  "coxsbazar": "কক্সবাজার",
  "dinajpur": "দিনাজপুর",
  "faridpur": "ফরিদপুর",
  "jashore": "যশোর",
  "jessore": "যশোর",
  "kushtia": "কুষ্টিয়া",
  "pabna": "পাবনা",
  "tangail": "টাঙ্গাইল",
  "jamalpur": "জামালপুর",
  "kishoreganj": "কিশোরগঞ্জ",
  "manikganj": "মানিকগঞ্জ",
  "munshiganj": "মুন্সীগঞ্জ",
  "narsingdi": "নরসিংদী",
  "habiganj": "হবিগঞ্জ",
  "moulvibazar": "মৌলভীবাজার",
  "sunamganj": "সুনামগঞ্জ",
  "bagerhat": "বাগেরহাট",
  "satkhira": "সাতক্ষীরা",
  "chuadanga": "চুয়াডাঙ্গা",
  "jhenaidah": "ঝিনাইদহ",
  "magura": "মাগুরা",
  "meherpur": "মেহেরপুর",
  "narail": "নড়াইল",
  "sirajganj": "সিরাজগঞ্জ",
  "natore": "নাটোর",
  "naogaon": "নওগাঁ",
  "chapai nawabganj": "চাঁপাইনবাবগঞ্জ",
  "joypurhat": "জয়পুরহাট",
  "kurigram": "কুড়িগ্রাম",
  "lalmonirhat": "লালমনিরহাট",
  "nilphamari": "নীলফামারী",
  "gaibandha": "গাইবান্ধা",
  "panchagarh": "পঞ্চগড়",
  "thakurgaon": "ঠাকুরগাঁও",
  "barguna": "বরগুনা",
  "bhola": "ভোলা",
  "jhalokati": "ঝালকাঠি",
  "patuakhali": "পটুয়াখালী",
  "pirojpur": "পিরোজপুর",
  "bandarban": "বান্দরবান",
  "khagrachhari": "খাগড়াছড়ি",
  "rangamati": "রাঙ্গামাটি",
  "gopalganj": "গোপালগঞ্জ",
  "madaripur": "মাদারীপুর",
  "rajbari": "রাজবাড়ী",
  "shariatpur": "শরীয়তপুর",
  "netrokona": "নেত্রকোণা",
  "sherpur": "শেরপুর",
};

export const CLASS_LETTER_MAP: Record<string, string> = {
  "la": "ল",
  "l": "ল",
  "ha": "হ",
  "h": "হ",
  "ga": "গ",
  "g": "গ",
  "kha": "খ",
  "kh": "খ",
  "gha": "ঘ",
  "gh": "ঘ",
  "cha": "চ",
  "ch": "চ",
  "ja": "জ",
  "j": "জ",
  "jha": "ঝ",
  "ta": "ট",
  "t": "ট",
  "tha": "ঠ",
  "da": "ড",
  "d": "ড",
  "dha": "ঢ",
  "ka": "ক",
  "k": "ক",
  "ba": "ব",
  "b": "ব",
  "bha": "ভ",
  "bh": "ভ",
  "ma": "ম",
  "m": "ম",
  "dh": "ধ",
  "pa": "প",
  "p": "প",
  "fa": "ফ",
  "f": "ফ",
  "ya": "য",
  "y": "য",
  "ra": "র",
  "r": "র",
  "sha": "শ",
  "sh": "শ",
  "sa": "স",
  "s": "স",
  // Direct Bangla preservation
  "ক": "ক", "খ": "খ", "গ": "গ", "ঘ": "ঘ", "চ": "চ", "ছ": "ছ", "জ": "জ", "ঝ": "ঝ",
  "ট": "ট", "ঠ": "ঠ", "ড": "ড", "ঢ": "ঢ", "ত": "ত", "থ": "থ", "দ": "দ", "ধ": "ধ",
  "ন": "ন", "প": "প", "ফ": "ফ", "ব": "ব", "ভ": "ভ", "ম": "ম", "য": "য", "র": "র",
  "ল": "ল", "শ": "শ", "ষ": "ষ", "স": "স", "হ": "হ",
};

/**
 * Converts English digits to Bangla digits.
 */
export function convertDigitsToBangla(input: string): string {
  return input.replace(/[0-9]/g, (digit) => DIGIT_MAP[digit] || digit);
}

/**
 * Transliterates a district or metro zone name.
 */
export function transliterateDistrict(input: string): string {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  if (DISTRICT_MAP[lower]) {
    return DISTRICT_MAP[lower];
  }
  // If already in Bangla, return as is
  return trimmed;
}

/**
 * Transliterates a vehicle class letter (e.g. LA -> ল).
 */
export function transliterateClassLetter(input: string): string {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  if (CLASS_LETTER_MAP[lower]) {
    return CLASS_LETTER_MAP[lower];
  }
  return trimmed;
}

export interface ParsedPlate {
  districtBangla: string;
  classLetterBangla: string;
  part1Bangla: string;
  part2Bangla: string;
  modelAFormatted: string; // ঢাকা মেট্রো-ল ১২-৩৪৫৬
  modelBLine1: string;     // ঢাকা মেট্রো
  modelBLine2: string;     // ল-১২-৩৪৫৬
}

/**
 * Parses freeform input or separate parts into canonical BRTA plate representations.
 * Handles inputs like:
 * - "Dhaka Metro LA 12 3456"
 * - "Cumilla HA 11 0052"
 * - "ঢাকা মেট্রো-ল-১২-৩৪৫৬"
 */
export function parseAndFormatPlate(input: string): ParsedPlate {
  const normalized = input.trim().replace(/[-–—]/g, " ").replace(/\s+/g, " ");

  // Check if string contains known metro or district
  let matchedDistrict = "";
  let remaining = normalized;

  // Sort keys by length descending to match multi-word entries first (e.g. "dhaka metro" before "dhaka")
  const sortedDistricts = Object.keys(DISTRICT_MAP).sort((a, b) => b.length - a.length);

  for (const distKey of sortedDistricts) {
    const regex = new RegExp(`^${distKey}\\b`, "i");
    if (regex.test(remaining)) {
      matchedDistrict = DISTRICT_MAP[distKey];
      remaining = remaining.replace(regex, "").trim();
      break;
    }
  }

  // If not matched via English dictionary, check for direct Bangla district names
  if (!matchedDistrict) {
    const banglaDistricts = Object.values(DISTRICT_MAP);
    for (const bDist of banglaDistricts) {
      if (remaining.startsWith(bDist)) {
        matchedDistrict = bDist;
        remaining = remaining.slice(bDist.length).trim();
        break;
      }
    }
  }

  if (!matchedDistrict) {
    matchedDistrict = "ঢাকা মেট্রো";
  }

  // Tokenize the remainder to find class letter, part1, part2
  const tokens = remaining.split(/\s+/).filter(Boolean);
  let classLetter = "ল";
  let part1 = "১২";
  let part2 = "৩৪৫৬";

  if (tokens.length >= 3) {
    classLetter = transliterateClassLetter(tokens[0]);
    part1 = convertDigitsToBangla(tokens[1]);
    part2 = convertDigitsToBangla(tokens[2]);
  } else if (tokens.length === 2) {
    classLetter = transliterateClassLetter(tokens[0]);
    // check if second token is combined digits (e.g. 123456) or single part
    const digits = convertDigitsToBangla(tokens[1]);
    if (digits.length > 2) {
      part1 = digits.slice(0, 2);
      part2 = digits.slice(2);
    } else {
      part1 = digits;
      part2 = "৩৪৫৬";
    }
  } else if (tokens.length === 1) {
    const single = tokens[0];
    if (CLASS_LETTER_MAP[single.toLowerCase()]) {
      classLetter = transliterateClassLetter(single);
    } else {
      const converted = convertDigitsToBangla(single);
      if (converted.length >= 6) {
        part1 = converted.slice(0, 2);
        part2 = converted.slice(2, 6);
      }
    }
  }

  const modelAFormatted = `${matchedDistrict}-${classLetter} ${part1}-${part2}`;
  const modelBLine1 = matchedDistrict;
  const modelBLine2 = `${classLetter}-${part1}-${part2}`;

  return {
    districtBangla: matchedDistrict,
    classLetterBangla: classLetter,
    part1Bangla: part1,
    part2Bangla: part2,
    modelAFormatted,
    modelBLine1,
    modelBLine2,
  };
}
