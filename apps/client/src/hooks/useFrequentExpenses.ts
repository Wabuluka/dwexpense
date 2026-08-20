import { useQuery } from '@tanstack/react-query';
import type { FrequentExpense } from '@dwexpense/types';
import { api } from '../lib/api';

/** The user's most-repeated (note, bucket) pairs — powers note autocomplete + auto-fill. */
export function useFrequentExpenses() {
  return useQuery({
    queryKey: ['expenses-frequent'],
    queryFn: async () => {
      const { data } = await api.get<FrequentExpense[]>('/expenses/frequent');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
