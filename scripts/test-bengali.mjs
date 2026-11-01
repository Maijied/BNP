import { parseAndFormatPlate, convertDigitsToBangla, transliterateDistrict, transliterateClassLetter } from "../lib/bengali.ts";

const testCases = [
  {
    input: "Dhaka Metro LA 12 3456",
    expectedModelA: "ঢাকা মেট্রো-ল ১২-৩৪৫৬",
    expectedModelB1: "ঢাকা মেট্রো",
    expectedModelB2: "ল-১২-৩৪৫৬",
  },
  {
    input: "Cumilla HA 11 0052",
    expectedModelA: "কুমিল্লা-হ ১১-০০৫২",
    expectedModelB1: "কুমিল্লা",
    expectedModelB2: "হ-১১-০০৫২",
  },
  {
    input: "Chattogram Metro GA 13 9999",
    expectedModelA: "চট্টগ্রাম মেট্রো-গ ১৩-৯৯৯৯",
    expectedModelB1: "চট্টগ্রাম মেট্রো",
    expectedModelB2: "গ-১৩-৯৯৯৯",
  },
  {
    input: "Sylhet Metro LA 21 4589",
    expectedModelA: "সিলেট মেট্রো-ল ২১-৪৫৮৯",
    expectedModelB1: "সিলেট মেট্রো",
    expectedModelB2: "ল-২১-৪৫৮৯",
  },
  {
    input: "Bogura HA 12 3456",
    expectedModelA: "বগুড়া-হ ১২-৩৪৫৬",
    expectedModelB1: "বগুড়া",
    expectedModelB2: "হ-১২-৩৪৫৬",
  },
];

console.log("=== Running Bengali Transliteration Verification ===");
let passed = 0;

for (const tc of testCases) {
  const result = parseAndFormatPlate(tc.input);
  const okA = result.modelAFormatted === tc.expectedModelA;
  const okB1 = result.modelBLine1 === tc.expectedModelB1;
  const okB2 = result.modelBLine2 === tc.expectedModelB2;

  if (okA && okB1 && okB2) {
    console.log(`✓ Passed: "${tc.input}" -> "${result.modelAFormatted}"`);
    passed++;
  } else {
    console.error(`✗ Failed for: "${tc.input}"`);
    console.error(`  Expected A: "${tc.expectedModelA}", Got: "${result.modelAFormatted}"`);
    console.error(`  Expected B: "${tc.expectedModelB1}" / "${tc.expectedModelB2}", Got: "${result.modelBLine1}" / "${result.modelBLine2}"`);
    process.exit(1);
  }
}

console.log(`\nAll ${passed} test cases passed successfully!`);
