import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { updateBriefingPreferencesSchema } from "@/lib/briefing-preferences.schema";

describe("updateBriefingPreferencesSchema", () => {
  it("accepts a briefing source list containing more than 60 domains", () => {
    const sources = Array.from({ length: 281 }, (_, index) => `news-${index}.example`);
    assert.equal(updateBriefingPreferencesSchema.safeParse({ sources }).success, true);
  });

  it("rejects a source list exceeding 400 domains", () => {
    const sources = Array.from({ length: 401 }, (_, index) => `news-${index}.example`);
    assert.equal(updateBriefingPreferencesSchema.safeParse({ sources }).success, false);
  });
});