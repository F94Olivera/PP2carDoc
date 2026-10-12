export type FinanceQuery = {
  /** Inclusive calendar day in America/Argentina/Buenos_Aires (YYYY-MM-DD). */
  startDate: string;
  /** Inclusive; internally bounded by the start of the next day. */
  endDate: string;
};

export type FinanceResponse = {
  /** Closed order items, including archived parents; no currency conversion. */
  total: number;
};
