import { FormEvent, useEffect, useRef, useState } from 'react';
import { ShoppingCart, Plus, Trash2, X, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useShoppingLists,
  useShoppingItems,
  useAddShoppingList,
  useDeleteShoppingList,
  useAddShoppingItem,
  useDeleteShoppingItem,
  useCheckShoppingItem,
} from '../hooks/useShopping';
import { useBuckets } from '../hooks/useBuckets';
import { money } from '../lib/format';
import { Field } from '../components/Field';
import type { ShoppingItem } from '@dwexpense/types';

export function ShoppingListPage() {
  const { data: lists = [], isLoading: listsLoading } = useShoppingLists();
  const { data: buckets = [] } = useBuckets();

  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const addList = useAddShoppingList();

  // Default to first list once loaded
  useEffect(() => {
    if (!activeListId && lists.length > 0) setActiveListId(lists[0]._id);
  }, [lists, activeListId]);

  function submitNewList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    addList.mutate(
      { name: newListName.trim() },
      {
        onSuccess: (list) => {
          setActiveListId(list._id);
          setNewListName('');
          setShowNewList(false);
          toast.success('List created');
        },
      }
    );
  }

  const activeList = lists.find((l) => l._id === activeListId) ?? null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Shopping Lists</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Plan purchases and log them as expenses when you buy</p>
        </div>
        <button
          onClick={() => setShowNewList((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
        >
          <Plus size={14} /> New list
        </button>
      </div>

      {/* New list inline form */}
      {showNewList && (
        <form onSubmit={submitNewList} className="flex gap-2">
          <Field
            autoFocus
            placeholder="List name (e.g. Weekly groceries)"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={addList.isPending || !newListName.trim()}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
          >
            {addList.isPending
              ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <Check size={14} />}
            Create
          </button>
          <button
            type="button"
            onClick={() => { setShowNewList(false); setNewListName(''); }}
            className="rounded-lg px-3 py-2 text-sm transition hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
          >
            <X size={14} />
          </button>
        </form>
      )}

      {/* Loading */}
      {listsLoading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--color-surface-2)' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!listsLoading && lists.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <ShoppingCart size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-faint)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>No shopping lists yet.</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-faint)' }}>Create a list to plan your next shop.</p>
        </div>
      )}

      {/* Lists + items */}
      {!listsLoading && lists.length > 0 && (
        <div className="space-y-4">
          {/* List selector tabs */}
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => (
              <div key={list._id} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveListId(list._id)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                  style={{
                    backgroundColor: activeListId === list._id ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: activeListId === list._id ? 'var(--color-primary-fg)' : 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {list.name}
                </button>
                <DeleteListButton
                  listId={list._id}
                  listName={list.name}
                  activeListId={activeListId}
                  lists={lists}
                  setActiveListId={setActiveListId}
                />
              </div>
            ))}
          </div>

          {activeList && <ListItems listId={activeList._id} buckets={buckets} />}
        </div>
      )}
    </div>
  );
}

// ── Delete list button (needs its own hook call) ──────────────────────────────

function DeleteListButton({ listId, listName, activeListId, lists, setActiveListId }: {
  listId: string;
  listName: string;
  activeListId: string | null;
  lists: { _id: string }[];
  setActiveListId: (id: string | null) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const deleteList = useDeleteShoppingList();

  function handleDelete() {
    deleteList.mutate(listId, {
      onSuccess: () => {
        if (activeListId === listId) {
          const next = lists.find((l) => l._id !== listId);
          setActiveListId(next?._id ?? null);
        }
        setConfirm(false);
        toast.success('List deleted');
      },
    });
  }

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        className="rounded-lg p-1.5 transition hover:opacity-70"
        style={{ color: 'var(--color-text-faint)' }}
        title="Delete list"
      >
        <Trash2 size={12} />
      </button>
      {confirm && (
        <ConfirmDeleteModal
          message={`Delete "${listName}" and all its items?`}
          isPending={deleteList.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}

// ── List items panel ──────────────────────────────────────────────────────────

function ListItems({ listId, buckets }: {
  listId: string;
  buckets: { _id: string; name: string; color: string }[];
}) {
  const { data: items = [], isLoading } = useShoppingItems(listId);
  const addItem = useAddShoppingItem(listId);
  const deleteItem = useDeleteShoppingItem(listId);
  const checkItem = useCheckShoppingItem(listId);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [bucketId, setBucketId] = useState('');
  const [qty, setQty] = useState('1');
  const [checkTarget, setCheckTarget] = useState<ShoppingItem | null>(null);

  function resetAdd() { setName(''); setPrice(''); setBucketId(''); setQty('1'); }

  function submitAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addItem.mutate(
      {
        name: name.trim(),
        estimatedPrice: price ? parseFloat(price) : undefined,
        bucketId: bucketId || undefined,
        quantity: parseInt(qty) || 1,
      },
      { onSuccess: () => { resetAdd(); setShowAdd(false); } }
    );
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const estimatedTotal = unchecked.reduce((sum, i) => sum + (i.estimatedPrice ?? 0) * i.quantity, 0);

  return (
    <div
      className="rounded-xl space-y-4"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '1.25rem' }}
    >
      {/* Summary bar */}
      {items.length > 0 && (
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>{unchecked.length} item{unchecked.length !== 1 ? 's' : ''} remaining</span>
          {estimatedTotal > 0 && (
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
              Est. {money(estimatedTotal)}
            </span>
          )}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }} />
          ))}
        </div>
      )}

      {!isLoading && unchecked.length === 0 && checked.length === 0 && (
        <p className="text-center text-sm py-4" style={{ color: 'var(--color-text-faint)' }}>
          No items yet — add your first one below.
        </p>
      )}

      {/* Unchecked */}
      {unchecked.length > 0 && (
        <ul className="space-y-1.5">
          {unchecked.map((item) => (
            <ItemRow
              key={item._id}
              item={item}
              buckets={buckets}
              onCheck={() => setCheckTarget(item)}
              onDelete={() => deleteItem.mutate(item._id, { onSuccess: () => toast.success('Removed') })}
            />
          ))}
        </ul>
      )}

      {/* Checked / bought */}
      {checked.length > 0 && (
        <details className="group">
          <summary
            className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium select-none"
            style={{ color: 'var(--color-text-faint)' }}
          >
            <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
            {checked.length} bought
          </summary>
          <ul className="mt-2 space-y-1.5">
            {checked.map((item) => (
              <ItemRow
                key={item._id}
                item={item}
                buckets={buckets}
                onCheck={() => checkItem.mutate({ id: item._id })}
                onDelete={() => deleteItem.mutate(item._id, { onSuccess: () => toast.success('Removed') })}
                dimmed
              />
            ))}
          </ul>
        </details>
      )}

      {/* Add item */}
      {showAdd ? (
        <form
          onSubmit={submitAdd}
          className="space-y-3 pt-2"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field
              autoFocus
              required
              label="Item name"
              placeholder="e.g. Whole milk"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Field
              type="number"
              step="0.01"
              min="0"
              label="Est. price (optional)"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Field
              as="select"
              label="Budget bucket (optional)"
              value={bucketId}
              onChange={(e) => setBucketId(e.target.value)}
            >
              <option value="">— No bucket —</option>
              {buckets.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </Field>
            <Field
              type="number"
              min="1"
              step="1"
              label="Quantity"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addItem.isPending || !name.trim()}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
            >
              {addItem.isPending && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Add item
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); resetAdd(); }}
              className="rounded-lg px-3 py-2 text-sm transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition hover:opacity-80"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-muted)',
            border: '1px dashed var(--color-border)',
          }}
        >
          <Plus size={14} /> Add item
        </button>
      )}

      {/* Check-off confirmation */}
      {checkTarget && (
        <CheckConfirmModal
          item={checkTarget}
          buckets={buckets}
          isPending={checkItem.isPending}
          onConfirm={(createExpense, amount) => {
            checkItem.mutate(
              { id: checkTarget._id, createExpense, amount },
              {
                onSuccess: ({ expense }) => {
                  setCheckTarget(null);
                  toast.success(expense ? 'Marked bought & expense logged' : 'Marked as bought');
                },
              }
            );
          }}
          onCancel={() => setCheckTarget(null)}
        />
      )}
    </div>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  buckets,
  onCheck,
  onDelete,
  dimmed = false,
}: {
  item: ShoppingItem;
  buckets: { _id: string; name: string; color: string }[];
  onCheck: () => void;
  onDelete: () => void;
  dimmed?: boolean;
}) {
  const bucket = buckets.find((b) => b._id === item.bucketId);

  return (
    <li
      className="flex items-center gap-2 rounded-lg px-3 py-2 transition"
      style={{ backgroundColor: 'var(--color-surface-2)', opacity: dimmed ? 0.5 : 1 }}
    >
      <button
        onClick={onCheck}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition hover:opacity-70"
        style={{
          border: `1.5px solid ${item.checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
          backgroundColor: item.checked ? 'var(--color-primary)' : 'transparent',
        }}
      >
        {item.checked && <Check size={11} color="white" strokeWidth={3} />}
      </button>

      <div className="flex flex-1 items-center gap-2 min-w-0 flex-wrap">
        <span
          className="text-sm font-medium truncate"
          style={{
            color: 'var(--color-text)',
            textDecoration: item.checked ? 'line-through' : 'none',
          }}
        >
          {item.name}
        </span>
        {item.quantity > 1 && (
          <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>×{item.quantity}</span>
        )}
        {item.estimatedPrice != null && (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            ~{money(item.estimatedPrice * item.quantity)}
          </span>
        )}
        {bucket && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${bucket.color}20`, color: bucket.color }}
          >
            {bucket.name}
          </span>
        )}
      </div>

      <button
        onClick={onDelete}
        className="flex-shrink-0 rounded p-1 transition hover:opacity-70"
        style={{ color: 'var(--color-text-faint)' }}
      >
        <X size={13} />
      </button>
    </li>
  );
}

// ── Check-off modal ───────────────────────────────────────────────────────────

function CheckConfirmModal({
  item,
  buckets,
  onConfirm,
  onCancel,
  isPending,
}: {
  item: ShoppingItem;
  buckets: { _id: string; name: string; color: string }[];
  onConfirm: (createExpense: boolean, amount?: number) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const bucket = buckets.find((b) => b._id === item.bucketId);
  const [amount, setAmount] = useState(
    item.estimatedPrice != null ? String(item.estimatedPrice * item.quantity) : ''
  );

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.currentTarget === e.target) onCancel(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Mark as bought</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            <span className="font-medium" style={{ color: 'var(--color-text)' }}>{item.name}</span>
            {item.quantity > 1 && ` ×${item.quantity}`}
          </p>
        </div>

        {bucket ? (
          <>
            <Field
              type="number"
              step="0.01"
              min="0"
              label={`Actual amount to log to "${bucket.name}"`}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => onConfirm(true, parseFloat(amount) || undefined)}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
              >
                {isPending && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                Log expense
              </button>
              <button
                onClick={() => onConfirm(false)}
                disabled={isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
              >
                Just mark bought
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm(false)}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
            >
              {isPending && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Mark as bought
            </button>
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared confirm delete modal ───────────────────────────────────────────────

function ConfirmDeleteModal({
  message,
  isPending = false,
  onConfirm,
  onCancel,
}: {
  message: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.currentTarget === e.target) onCancel(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
        </div>
        <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{message}</p>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>This cannot be undone.</p>
        <div className="mt-5 flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-error)', color: '#fff' }}
          >
            {isPending && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isPending ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
