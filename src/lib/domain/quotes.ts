import { quotesData } from "@/lib/generated/quotes-data";
import type { GeneratedQuote, QuoteCategory } from "@/lib/domain/types";

const byCategory = new Map<QuoteCategory, GeneratedQuote[]>();

for (const quote of quotesData) {
  const list = byCategory.get(quote.category) ?? [];
  list.push(quote);
  byCategory.set(quote.category, list);
}

export function getQuote(category: QuoteCategory, index: number): GeneratedQuote | null {
  const list = byCategory.get(category) ?? [];
  if (list.length === 0) {
    return null;
  }

  return list[index % list.length] ?? null;
}
