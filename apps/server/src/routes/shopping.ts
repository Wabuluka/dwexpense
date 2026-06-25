import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ShoppingList } from '../models/ShoppingList';
import { ShoppingItem } from '../models/ShoppingItem';
import { Bucket } from '../models/Bucket';
import { Expense } from '../models/Expense';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import type {
  CreateShoppingListInput,
  CreateShoppingItemInput,
  UpdateShoppingItemInput,
  CheckShoppingItemInput,
} from '@dwexpense/types';

export const shoppingRouter = Router();

const uid = (req: Request) => (req as AuthedRequest).userId!;

/** GET /api/shopping/lists */
shoppingRouter.get('/lists', asyncHandler(async (req: Request, res: Response) => {
  const lists = await ShoppingList.find({ userId: uid(req) }).sort({ createdAt: -1 }).lean();
  res.json(lists);
}));

/** POST /api/shopping/lists */
shoppingRouter.post('/lists', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body as CreateShoppingListInput;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required', status: 400 });
  }
  const list = await ShoppingList.create({ userId: uid(req), name: name.trim() });
  res.status(201).json(list);
}));

/** DELETE /api/shopping/lists/:id — also removes all items in the list */
shoppingRouter.delete('/lists/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }
  const list = await ShoppingList.findOneAndDelete({ _id: id, userId });
  if (!list) return res.status(404).json({ error: 'List not found', status: 404 });
  await ShoppingItem.deleteMany({ listId: id, userId });
  res.json({ success: true });
}));

/** GET /api/shopping/lists/:id/items */
shoppingRouter.get('/lists/:id/items', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }
  const list = await ShoppingList.findOne({ _id: id, userId }).lean();
  if (!list) return res.status(404).json({ error: 'List not found', status: 404 });

  const items = await ShoppingItem.find({ listId: id, userId }).sort({ createdAt: 1 }).lean();
  res.json(items);
}));

/** POST /api/shopping/lists/:id/items */
shoppingRouter.post('/lists/:id/items', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }
  const list = await ShoppingList.findOne({ _id: id, userId }).lean();
  if (!list) return res.status(404).json({ error: 'List not found', status: 404 });

  const { name, estimatedPrice, bucketId, quantity } = req.body as CreateShoppingItemInput;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required', status: 400 });
  }
  if (estimatedPrice !== undefined && (typeof estimatedPrice !== 'number' || estimatedPrice < 0)) {
    return res.status(400).json({ error: 'estimatedPrice must be a non-negative number', status: 400 });
  }
  if (bucketId) {
    if (!mongoose.isValidObjectId(bucketId)) {
      return res.status(400).json({ error: 'Invalid bucketId', status: 400 });
    }
    const bucket = await Bucket.findOne({ _id: bucketId, userId }).lean();
    if (!bucket) return res.status(404).json({ error: 'Bucket not found', status: 404 });
  }

  const item = await ShoppingItem.create({
    userId,
    listId: id,
    name: name.trim(),
    estimatedPrice,
    bucketId: bucketId || undefined,
    quantity: quantity ?? 1,
  });
  res.status(201).json(item);
}));

/** PATCH /api/shopping/items/:id */
shoppingRouter.patch('/items/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid item id', status: 400 });
  }
  const { name, estimatedPrice, bucketId, quantity } = req.body as UpdateShoppingItemInput;

  if (bucketId) {
    if (!mongoose.isValidObjectId(bucketId)) {
      return res.status(400).json({ error: 'Invalid bucketId', status: 400 });
    }
    const bucket = await Bucket.findOne({ _id: bucketId, userId }).lean();
    if (!bucket) return res.status(404).json({ error: 'Bucket not found', status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name.trim();
  if (estimatedPrice !== undefined) update.estimatedPrice = estimatedPrice;
  if (bucketId !== undefined) update.bucketId = bucketId || null;
  if (quantity !== undefined) update.quantity = quantity;

  const item = await ShoppingItem.findOneAndUpdate({ _id: id, userId }, update, { new: true });
  if (!item) return res.status(404).json({ error: 'Item not found', status: 404 });
  res.json(item);
}));

/** DELETE /api/shopping/items/:id */
shoppingRouter.delete('/items/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid item id', status: 400 });
  }
  const item = await ShoppingItem.findOneAndDelete({ _id: id, userId });
  if (!item) return res.status(404).json({ error: 'Item not found', status: 404 });
  res.json({ success: true });
}));

/** POST /api/shopping/items/:id/check — toggle checked; optionally create an expense */
shoppingRouter.post('/items/:id/check', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid item id', status: 400 });
  }

  const item = await ShoppingItem.findOne({ _id: id, userId });
  if (!item) return res.status(404).json({ error: 'Item not found', status: 404 });

  const nowChecking = !item.checked;
  item.checked = nowChecking;
  item.checkedAt = nowChecking ? new Date() : undefined;
  await item.save();

  let expense = null;
  if (nowChecking) {
    const { createExpense, amount, date } = req.body as CheckShoppingItemInput;
    const expenseAmount = amount ?? item.estimatedPrice;

    if (createExpense && item.bucketId && expenseAmount && expenseAmount > 0) {
      const bucket = await Bucket.findOne({ _id: item.bucketId, userId }).lean();
      if (bucket) {
        const expenseDate = date
          ? (() => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d); })()
          : new Date();
        expense = await Expense.create({
          userId,
          bucketId: item.bucketId,
          amount: expenseAmount * item.quantity,
          note: item.name,
          date: expenseDate,
        });
      }
    }
  }

  res.json({ item, expense });
}));
