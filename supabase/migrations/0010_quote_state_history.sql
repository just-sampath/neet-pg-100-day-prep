alter table if exists app_settings
  add column if not exists quote_state jsonb not null default
    '{"daySelections":{},"categoryCycles":{"daily":{"usedQuoteIds":[],"cycleCount":0},"tough_day":{"usedQuoteIds":[],"cycleCount":0},"celebration":{"usedQuoteIds":[],"cycleCount":0}}}'::jsonb;
