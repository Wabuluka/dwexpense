import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ShoppingList,
  ShoppingItem,
  CreateShoppingListInput,
  CreateShoppingItemInput,
  UpdateShoppingItemInput,
  CheckShoppingItemInput,
} from '@dwexpense/types';
import { api } from '../lib/api';

export function useShoppingLists() {
  return useQuery({
    queryKey: ['shopping-lists'],
    queryFn: async () => {
      const { data } = await api.get<ShoppingList[]>('/shopping/lists');
      return data;
    },
  });
}

export function useShoppingItems(listId: string | null) {
  return useQuery({
    queryKey: ['shopping-items', listId],
    queryFn: async () => {
      const { data } = await api.get<ShoppingItem[]>(`/shopping/lists/${listId}/items`);
      return data;
    },
    enabled: !!listId,
  });
}

export function useAddShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateShoppingListInput) => {
      const { data } = await api.post<ShoppingList>('/shopping/lists', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-lists'] }),
  });
}

export function useDeleteShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      await api.delete(`/shopping/lists/${listId}`);
      return listId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-lists'] }),
  });
}

export function useAddShoppingItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateShoppingItemInput) => {
      const { data } = await api.post<ShoppingItem>(`/shopping/lists/${listId}/items`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-items', listId] }),
  });
}

export function useUpdateShoppingItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateShoppingItemInput & { id: string }) => {
      const { data } = await api.patch<ShoppingItem>(`/shopping/items/${id}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-items', listId] }),
  });
}

export function useDeleteShoppingItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/shopping/items/${itemId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-items', listId] }),
  });
}

export function useCheckShoppingItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CheckShoppingItemInput & { id: string }) => {
      const { data } = await api.post<{ item: ShoppingItem; expense: unknown | null }>(
        `/shopping/items/${id}/check`,
        input
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopping-items', listId] });
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}
