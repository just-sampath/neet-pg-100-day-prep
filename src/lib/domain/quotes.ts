import { quotesData } from "@/lib/generated/quotes-data";
import type {
  GeneratedQuote,
  QuoteCategory,
  QuoteCategoryCycleState,
  QuoteState,
  TrafficLight,
} from "@/lib/domain/types";

const quoteCategories = ["daily", "tough_day", "celebration"] as const satisfies QuoteCategory[];

type QuotePools = Record<QuoteCategory, GeneratedQuote[]>;

const defaultQuotePools = quoteCategories.reduce<QuotePools>((pools, category) => {
  pools[category] = quotesData.filter((quote) => quote.category === category);
  return pools;
}, {
  daily: [],
  tough_day: [],
  celebration: [],
});

const quoteById = new Map(quotesData.map((quote) => [quote.id, quote]));

function emptyCycleState(): QuoteCategoryCycleState {
  return {
    usedQuoteIds: [],
    cycleCount: 0,
  };
}

export function emptyQuoteState(): QuoteState {
  return {
    daySelections: {},
    categoryCycles: {
      daily: emptyCycleState(),
      tough_day: emptyCycleState(),
      celebration: emptyCycleState(),
    },
  };
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getValidIdsByCategory(pools: QuotePools) {
  return quoteCategories.reduce<Record<QuoteCategory, Set<string>>>((result, category) => {
    result[category] = new Set(pools[category].map((quote) => quote.id));
    return result;
  }, {
    daily: new Set<string>(),
    tough_day: new Set<string>(),
    celebration: new Set<string>(),
  });
}

function normalizeCategoryCycleState(
  value: QuoteCategoryCycleState | undefined,
  validIds: Set<string>,
): QuoteCategoryCycleState {
  const usedQuoteIds = Array.isArray(value?.usedQuoteIds)
    ? value.usedQuoteIds.filter((quoteId, index, array): quoteId is string => {
        return typeof quoteId === "string" && validIds.has(quoteId) && array.indexOf(quoteId) === index;
      })
    : [];

  return {
    usedQuoteIds,
    cycleCount: typeof value?.cycleCount === "number" && Number.isFinite(value.cycleCount) ? Math.max(0, Math.floor(value.cycleCount)) : 0,
  };
}

export function normalizeQuoteState(value: QuoteState | undefined, pools: QuotePools = defaultQuotePools): QuoteState {
  const base = value ?? emptyQuoteState();
  const validIdsByCategory = getValidIdsByCategory(pools);

  const daySelections = Object.entries(base.daySelections ?? {}).reduce<QuoteState["daySelections"]>((entries, [dateKey, selections]) => {
    if (!isDateKey(dateKey) || !selections || typeof selections !== "object") {
      return entries;
    }

    const normalizedSelections = quoteCategories.reduce<Partial<Record<QuoteCategory, string>>>((acc, category) => {
      const quoteId = selections[category];
      if (typeof quoteId === "string" && validIdsByCategory[category].has(quoteId)) {
        acc[category] = quoteId;
      }
      return acc;
    }, {});

    if (Object.keys(normalizedSelections).length > 0) {
      entries[dateKey] = normalizedSelections;
    }

    return entries;
  }, {});

  return {
    daySelections,
    categoryCycles: {
      daily: normalizeCategoryCycleState(base.categoryCycles?.daily, validIdsByCategory.daily),
      tough_day: normalizeCategoryCycleState(base.categoryCycles?.tough_day, validIdsByCategory.tough_day),
      celebration: normalizeCategoryCycleState(base.categoryCycles?.celebration, validIdsByCategory.celebration),
    },
  };
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickQuoteId(candidateIds: string[], seed: string) {
  return candidateIds
    .toSorted((left, right) => {
      const delta = stableHash(`${seed}:${left}`) - stableHash(`${seed}:${right}`);
      return delta || left.localeCompare(right);
    })
    .at(0) ?? null;
}

function getQuoteFromPools(pools: QuotePools, quoteId: string | null) {
  if (!quoteId) {
    return null;
  }

  return quoteById.get(quoteId) ?? quoteCategories.flatMap((category) => pools[category]).find((quote) => quote.id === quoteId) ?? null;
}

export function selectQuoteForDay(
  quoteState: QuoteState,
  category: QuoteCategory,
  dateKey: string,
  userKey: string,
  pools: QuotePools = defaultQuotePools,
) {
  if (!isDateKey(dateKey)) {
    return null;
  }

  const categoryPool = pools[category] ?? [];
  if (categoryPool.length === 0) {
    return null;
  }

  const existingId = quoteState.daySelections[dateKey]?.[category] ?? null;
  const existingQuote = getQuoteFromPools(pools, existingId);
  if (existingQuote) {
    return existingQuote;
  }

  const validIds = new Set(categoryPool.map((quote) => quote.id));
  const categoryCycle = normalizeCategoryCycleState(quoteState.categoryCycles[category], validIds);
  let usedQuoteIds = categoryCycle.usedQuoteIds;
  let cycleCount = categoryCycle.cycleCount;
  let remainingIds = categoryPool.map((quote) => quote.id).filter((quoteId) => !usedQuoteIds.includes(quoteId));

  if (remainingIds.length === 0) {
    const lastShownId = usedQuoteIds.at(-1) ?? null;
    usedQuoteIds = [];
    cycleCount += 1;
    remainingIds = categoryPool.map((quote) => quote.id);

    if (lastShownId && remainingIds.length > 1) {
      remainingIds = remainingIds.filter((quoteId) => quoteId !== lastShownId);
    }
  }

  const selectedId = pickQuoteId(remainingIds, `${userKey}:${category}:${dateKey}:${cycleCount}`);
  const selectedQuote = getQuoteFromPools(pools, selectedId);

  if (!selectedQuote || !selectedId) {
    return null;
  }

  quoteState.daySelections[dateKey] = {
    ...(quoteState.daySelections[dateKey] ?? {}),
    [category]: selectedId,
  };
  quoteState.categoryCycles[category] = {
    usedQuoteIds: [...usedQuoteIds, selectedId],
    cycleCount,
  };

  return selectedQuote;
}

export function getTodayQuoteSelection(
  quoteState: QuoteState,
  options: {
    dateKey: string;
    userKey: string;
    trafficLight: TrafficLight;
    dayComplete: boolean;
  },
  pools: QuotePools = defaultQuotePools,
) {
  const dailyQuote = selectQuoteForDay(quoteState, "daily", options.dateKey, options.userKey, pools);
  const toughQuote =
    options.trafficLight === "green" ? null : selectQuoteForDay(quoteState, "tough_day", options.dateKey, options.userKey, pools);
  const celebrationQuote = options.dayComplete
    ? selectQuoteForDay(quoteState, "celebration", options.dateKey, options.userKey, pools)
    : null;

  if (options.dayComplete) {
    return {
      lineCategory: null,
      lineQuote: null,
      dailyQuote,
      toughQuote,
      celebrationQuote,
    };
  }

  return {
    lineCategory: options.trafficLight === "green" ? ("daily" as const) : ("tough_day" as const),
    lineQuote: options.trafficLight === "green" ? dailyQuote : toughQuote,
    dailyQuote,
    toughQuote,
    celebrationQuote,
  };
}

export function getQuotePoolsForTesting() {
  return defaultQuotePools;
}
