import { Schema, model, Document, Types } from 'mongoose';

export interface ShoppingListDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  name: string;
  createdAt: Date;
}

const shoppingListSchema = new Schema<ShoppingListDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export const ShoppingList = model<ShoppingListDoc>('ShoppingList', shoppingListSchema);
