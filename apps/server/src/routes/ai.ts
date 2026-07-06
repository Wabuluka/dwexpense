import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { User } from '../models/User';
import { Bucket } from '../models/Bucket';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { SavingsGoal } from '../models/SavingsGoal';
import { monthRange, currentMonthKey } from '../lib/dates';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';

export const aiRouter = Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** POST /api/ai/chat — streaming chat with financial context */
aiRouter.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId!;
  const oid = new mongoose.Types.ObjectId(userId);
  const { messages } = req.body as { messages: ChatMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required', status: 400 });
  }

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ error: 'User not found', status: 404 });

  const now = new Date();
  const { start, end } = monthRange(currentMonthKey(now));
  const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };

  const [buckets, savingsGoals, spendAgg, incomeAgg, recentExpenses] = await Promise.all([
    Bucket.find({ userId }).lean(),
    SavingsGoal.find({ userId }).lean(),
    Expense.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { userId: oid, date: { $gte: start, $lt: end }, ...notDeleted } },
      { $group: { _id: '$bucketId', total: { $sum: '$amount' } } },
    ]),
    Income.aggregate<{ total: number }>([
      { $match: { userId: oid, date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.find({ userId: oid, date: { $gte: start, $lt: end }, ...notDeleted })
      .sort({ date: -1 })
      .limit(20)
      .lean(),
  ]);

  const spentMap = new Map(spendAgg.map(s => [s._id.toString(), s.total]));
  const totalSpent = spendAgg.reduce((s, r) => s + r.total, 0);
  const extraIncome = incomeAgg[0]?.total ?? 0;
  const totalIncome = user.monthlySalary + extraIncome;

  const bucketSummary = buckets.map(b => ({
    name: b.name,
    limit: b.monthlyLimit,
    spent: spentMap.get(b._id.toString()) ?? 0,
    remaining: b.monthlyLimit - (spentMap.get(b._id.toString()) ?? 0),
  }));

  const currency = user.currency ?? 'USD';
  const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedSpend = dayOfMonth > 0 ? (totalSpent / dayOfMonth) * daysInMonth : totalSpent;

  const systemPrompt = `You are a personal finance assistant embedded in DWExpense, a budgeting and savings tracking app. You help the user understand their spending, stay on budget, and reach their savings goals.

## User's Financial Snapshot — ${month}
- Monthly salary: ${currency} ${user.monthlySalary.toFixed(2)}
- Extra income this month: ${currency} ${extraIncome.toFixed(2)}
- Total income: ${currency} ${totalIncome.toFixed(2)}
- Monthly savings goal: ${currency} ${user.savingsGoal.toFixed(2)}
- Total spent so far: ${currency} ${totalSpent.toFixed(2)}
- Day ${dayOfMonth} of ${daysInMonth} — projected spend by month end: ${currency} ${projectedSpend.toFixed(2)}
- Remaining after spending & savings goal: ${currency} ${(totalIncome - user.savingsGoal - totalSpent).toFixed(2)}

## Budget Categories
${bucketSummary.map(b => `- ${b.name}: spent ${currency} ${b.spent.toFixed(2)} of ${currency} ${b.limit.toFixed(2)} limit (${currency} ${b.remaining.toFixed(2)} remaining)`).join('\n')}

## Savings Goals
${savingsGoals.length === 0 ? '- No savings goals set.' : savingsGoals.map(g => {
  const pct = g.targetAmount > 0 ? ((g.currentAmount / g.targetAmount) * 100).toFixed(1) : '0';
  const deadline = g.deadline ? ` — deadline: ${new Date(g.deadline).toLocaleDateString()}` : '';
  return `- ${g.name}: ${currency} ${g.currentAmount.toFixed(2)} / ${currency} ${g.targetAmount.toFixed(2)} (${pct}% complete${deadline})`;
}).join('\n')}

## Recent Expenses (last 20 this month)
${recentExpenses.map(e => {
  const bucket = buckets.find(b => b._id.toString() === e.bucketId?.toString());
  return `- ${new Date(e.date).toLocaleDateString()}: ${currency} ${e.amount.toFixed(2)}${e.note ? ` — ${e.note}` : ''}${bucket ? ` [${bucket.name}]` : ''}`;
}).join('\n')}

Be concise, warm, and actionable. Use the user's currency (${currency}). Format currency values with 2 decimal places. If the user asks something outside personal finance, gently redirect them.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}));
