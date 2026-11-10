import { describe, expect, it } from "bun:test";
import { isExactlyFiveBengaliSentences } from "@/lib/briefings.server";

describe("isExactlyFiveBengaliSentences", () => {
  const fiveSentenceSummary = [
    "রহিম আহমেদ সরকারি দপ্তরে দায়িত্ব পালন করেন",
    "তার বিরুদ্ধে সরকারি অর্থ আত্মসাতের অভিযোগ উঠেছে",
    "তদন্তে প্রায় পাঁচ কোটি টাকা অনিয়মের তথ্য পাওয়া গেছে",
    "দুদক এ ঘটনায় অনুসন্ধান শুরু করেছে বলে প্রতিবেদনে জানানো হয়েছে",
    "প্রতিবেদন অনুযায়ী অভিযুক্তের বক্তব্য পাওয়া যায়নি",
  ].join("।") + "।";

  it("accepts exactly five substantive Bengali sentences", () => {
    expect(isExactlyFiveBengaliSentences(fiveSentenceSummary)).toBe(true);
  });

  it("rejects four Bengali sentences", () => {
    expect(isExactlyFiveBengaliSentences(fiveSentenceSummary.split("।").slice(0, 4).join("।") + "।")).toBe(false);
  });

  it("rejects six Bengali sentences", () => {
    expect(isExactlyFiveBengaliSentences(`${fiveSentenceSummary} অতিরিক্ত বাক্য যোগ করা হয়েছে।`)).toBe(false);
  });

  it("rejects summaries written only in English", () => {
    expect(isExactlyFiveBengaliSentences("Rahim has a job. He faces an allegation. Five crore taka is involved. ACC opened an inquiry. The report has no response." )).toBe(false);
  });
});