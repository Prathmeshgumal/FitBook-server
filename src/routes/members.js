const { Router } = require('express');
const { z } = require('zod');
const sql = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const memberService = require('../services/memberService');
const membershipService = require('../services/membershipService');
const gymService = require('../services/gymService');

const router = Router();
router.use(requireAuth);

function validate(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: parsed.error.errors[0].message });
    return null;
  }
  return parsed.data;
}

/** Ensures req.user owns the gym that contains memberId */
async function requireMemberOwner(req, res) {
  const member = await memberService.getMemberById(sql, Number(req.params.memberId));
  if (!member) {
    res.status(404).json({ success: false, error: 'Member not found' });
    return null;
  }
  const gym = await gymService.getGymById(sql, member.gym_id);
  if (!gym || gym.owner_id !== req.user.id) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return null;
  }
  return { member, gym };
}

// ── Member detail ─────────────────────────────────────────────

router.get('/:memberId', asyncHandler(async (req, res) => {
  const ctx = await requireMemberOwner(req, res);
  if (!ctx) return;
  const detail = await memberService.getMemberDetail(sql, ctx.member.id);
  res.json({ success: true, data: detail });
}));

const UpdateMemberSchema = z.object({
  full_name: z.string().min(1).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().regex(/^\d{10,15}$/).optional(),
  email: z.string().email().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_blocked: z.boolean().optional(),
});

router.patch('/:memberId', asyncHandler(async (req, res) => {
  const ctx = await requireMemberOwner(req, res);
  if (!ctx) return;
  const data = validate(UpdateMemberSchema, req.body, res);
  if (!data) return;
  const updated = await memberService.updateMember(sql, ctx.member.id, {
    full_name: data.full_name,
    gender: data.gender,
    phone: data.phone,
    email: data.email,
    date_of_birth: data.date_of_birth,
    address: data.address,
    notes: data.notes,
    is_blocked: data.is_blocked,
  });
  res.json({ success: true, data: updated });
}));

router.delete('/:memberId', asyncHandler(async (req, res) => {
  const ctx = await requireMemberOwner(req, res);
  if (!ctx) return;
  await memberService.deleteMember(sql, ctx.member.id, ctx.gym.id);
  res.json({ success: true, data: { message: 'Member deleted' } });
}));

// ── Memberships (renew plan) ──────────────────────────────────

const AddMembershipSchema = z.object({
  plan_id: z.coerce.number().int().positive(),
  batch_id: z.coerce.number().int().positive().optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paid_amount: z.coerce.number().min(0).optional(),
  payment_method: z.string().optional(),
  discount: z.coerce.number().min(0).optional(),
  admission_fees: z.coerce.number().min(0).optional(),
  comments: z.string().optional(),
});

router.post('/:memberId/memberships', asyncHandler(async (req, res) => {
  const ctx = await requireMemberOwner(req, res);
  if (!ctx) return;
  const data = validate(AddMembershipSchema, req.body, res);
  if (!data) return;
  const membership = await membershipService.addMembership(sql, ctx.member.id, {
    planId: data.plan_id,
    batchId: data.batch_id,
    purchaseDate: data.purchase_date,
    paidAmount: data.paid_amount,
    paymentMethod: data.payment_method,
    discount: data.discount,
    admissionFees: data.admission_fees,
    comments: data.comments,
  });
  res.status(201).json({ success: true, data: membership });
}));

// ── Payments ──────────────────────────────────────────────────

const AddPaymentSchema = z.object({
  membership_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_method: z.string().optional(),
});

router.post('/:memberId/payments', asyncHandler(async (req, res) => {
  const ctx = await requireMemberOwner(req, res);
  if (!ctx) return;
  const data = validate(AddPaymentSchema, req.body, res);
  if (!data) return;
  const payment = await membershipService.addPayment(sql, data.membership_id, {
    amount: data.amount,
    paymentDate: data.payment_date,
    paymentMethod: data.payment_method,
  });
  res.status(201).json({ success: true, data: payment });
}));

router.delete('/:memberId/payments/:paymentId', asyncHandler(async (req, res) => {
  const ctx = await requireMemberOwner(req, res);
  if (!ctx) return;
  await membershipService.deletePayment(sql, Number(req.params.paymentId), ctx.gym.id);
  res.json({ success: true, data: { message: 'Payment deleted' } });
}));

module.exports = router;
