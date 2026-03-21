import { describe, expect, it } from "vitest";
import XLSX from "xlsx";

import { createEmptyUserState } from "@/lib/data/local-store";
import {
  getTodayQuoteSelection,
  normalizeQuoteState,
  selectQuoteForDay,
} from "@/lib/domain/quotes";
import type { GeneratedQuote, QuoteCategory } from "@/lib/domain/types";
import { quotesData } from "@/lib/generated/quotes-data";

const quotesWorkbook = XLSX.readFile("resources/quotes.csv", { type: "string" });
const quoteRows = XLSX.utils.sheet_to_json(quotesWorkbook.Sheets[quotesWorkbook.SheetNames[0] as string], { defval: "" });

function createQuote(category: QuoteCategory, suffix: string): GeneratedQuote {
  return {
    id: `${category}-${suffix}`,
    quote: `${category} ${suffix}`,
    author: `Author ${suffix}`,
    category,
  };
}

function createPools() {
  return {
    daily: [createQuote("daily", "1"), createQuote("daily", "2"), createQuote("daily", "3")],
    tough_day: [createQuote("tough_day", "1"), createQuote("tough_day", "2")],
    celebration: [createQuote("celebration", "1"), createQuote("celebration", "2")],
  };
}

describe("quote system", () => {
  it("keeps generated quotes aligned with the repo CSV", () => {
    expect(quotesData).toHaveLength(quoteRows.length);
    expect(new Set(quotesData.map((quote) => quote.category))).toEqual(new Set(["daily", "tough_day", "celebration"]));

    quotesData.forEach((quote, index) => {
      const row = quoteRows[index] as Record<string, string>;
      expect(quote.quote).toBe(String(row.quote));
      expect(quote.author).toBe(String(row.author));
      expect(quote.category).toBe(String(row.category));
    });
  });

  it("keeps the same quote for the same day without advancing the category cycle twice", () => {
    const quoteState = normalizeQuoteState(undefined, createPools());

    const first = selectQuoteForDay(quoteState, "daily", "2026-05-01", "local-user", createPools());
    const second = selectQuoteForDay(quoteState, "daily", "2026-05-01", "local-user", createPools());

    expect(first?.id).toBe(second?.id);
    expect(quoteState.categoryCycles.daily.usedQuoteIds).toHaveLength(1);
    expect(quoteState.daySelections["2026-05-01"]).toMatchObject({
      daily: first?.id,
    });
  });

  it("does not repeat within a category cycle and avoids an immediate repeat after reset when possible", () => {
    const pools = createPools();
    const quoteState = normalizeQuoteState(undefined, pools);

    const dayOne = selectQuoteForDay(quoteState, "daily", "2026-05-01", "local-user", pools)!;
    const dayTwo = selectQuoteForDay(quoteState, "daily", "2026-05-02", "local-user", pools)!;
    const dayThree = selectQuoteForDay(quoteState, "daily", "2026-05-03", "local-user", pools)!;
    const dayFour = selectQuoteForDay(quoteState, "daily", "2026-05-04", "local-user", pools)!;

    expect(new Set([dayOne.id, dayTwo.id, dayThree.id]).size).toBe(3);
    expect(dayFour.id).not.toBe(dayThree.id);
    expect(pools.daily.map((quote) => quote.id)).toContain(dayFour.id);
    expect(quoteState.categoryCycles.daily.usedQuoteIds).toHaveLength(1);
    expect(quoteState.categoryCycles.daily.cycleCount).toBe(1);
  });

  it("restores the original daily quote after a tough-day detour and keeps celebration separate", () => {
    const pools = createPools();
    const userState = createEmptyUserState();

    const greenSelection = getTodayQuoteSelection(
      userState.quoteState,
      {
        dateKey: "2026-05-01",
        userKey: "local-user",
        trafficLight: "green",
        dayComplete: false,
      },
      pools,
    );
    const yellowSelection = getTodayQuoteSelection(
      userState.quoteState,
      {
        dateKey: "2026-05-01",
        userKey: "local-user",
        trafficLight: "yellow",
        dayComplete: false,
      },
      pools,
    );
    const greenReturn = getTodayQuoteSelection(
      userState.quoteState,
      {
        dateKey: "2026-05-01",
        userKey: "local-user",
        trafficLight: "green",
        dayComplete: false,
      },
      pools,
    );
    const completionSelection = getTodayQuoteSelection(
      userState.quoteState,
      {
        dateKey: "2026-05-01",
        userKey: "local-user",
        trafficLight: "green",
        dayComplete: true,
      },
      pools,
    );

    expect(greenSelection.lineCategory).toBe("daily");
    expect(greenSelection.lineQuote?.id).toBe(greenReturn.lineQuote?.id);
    expect(yellowSelection.lineCategory).toBe("tough_day");
    expect(yellowSelection.lineQuote?.category).toBe("tough_day");
    expect(yellowSelection.lineQuote?.id).not.toBe(greenSelection.lineQuote?.id);
    expect(completionSelection.lineQuote).toBeNull();
    expect(completionSelection.celebrationQuote?.category).toBe("celebration");
    expect(userState.quoteState.daySelections["2026-05-01"]).toMatchObject({
      daily: greenSelection.dailyQuote?.id,
      tough_day: yellowSelection.toughQuote?.id,
      celebration: completionSelection.celebrationQuote?.id,
    });
  });

  it("drops invalid stored quote ids when the source data changes", () => {
    const pools = createPools();
    const normalized = normalizeQuoteState(
      {
        daySelections: {
          "2026-05-01": {
            daily: "daily-2",
            tough_day: "missing",
          },
        },
        categoryCycles: {
          daily: {
            usedQuoteIds: ["daily-2", "missing", "daily-2"],
            cycleCount: 3,
          },
          tough_day: {
            usedQuoteIds: ["missing"],
            cycleCount: 1,
          },
          celebration: {
            usedQuoteIds: [],
            cycleCount: 0,
          },
        },
      },
      pools,
    );

    expect(normalized.daySelections["2026-05-01"]).toMatchObject({
      daily: "daily-2",
    });
    expect(normalized.daySelections["2026-05-01"]?.tough_day).toBeUndefined();
    expect(normalized.categoryCycles.daily.usedQuoteIds).toEqual(["daily-2"]);
    expect(normalized.categoryCycles.tough_day.usedQuoteIds).toEqual([]);
  });
});
