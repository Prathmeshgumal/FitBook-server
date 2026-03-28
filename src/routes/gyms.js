const { Router } = require('express');
const { z } = require('zod');
const sql = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const gymService = require('../services/gymService');
const planService = require('../services/planService');
const batchService = require('../services/batchService');
const memberService = require('../services/memberService');

const router = Router();
router.use(requireAuth);

// ── Validation helpers ────────────────────────────────────────

const GymSchema = z.object({
  name: z.string().min(1),
  gym_type: z.string().min(1),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  opening_hours: z.string().optional(),
  logo_url: z.string().url().optional(),
});

const PlanSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().positive(),
  duration_value: z.coerce.number().int().positive(),
  duration_unit: z.enum(['months', 'days']),
});

const BatchSchema = z.object({
  name: z.string().min(1),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM or HH:MM:SS'),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM or HH:MM:SS'),
});

const AddMemberSchema = z.object({
  full_name: z.string().min(1),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  membership_id: z.string().optional(),
  plan_id: z.string().uuid(),
  batch_id: z.string().uuid().optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  paid_amount: z.coerce.number().min(0).optional(),
  payment_method: z.string().optional(),
  discount: z.coerce.number().min(0).optional(),
  admission_fees: z.coerce.number().min(0).optional(),
  comments: z.string().optional(),
});

function validate(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: parsed.error.errors[0].message });
    return null;
  }
  return parsed.data;
}

/** Ensures req.user owns the gym with :gymId */
async function requireGymOwner(req, res) {
  const gym = await gymService.getGymById(sql, req.params.gymId);
  if (!gym) {
    res.status(404).json({ success: false, error: 'Gym not found' });
    return null;
  }
  if (gym.owner_id !== req.user.id) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return null;
  }
  return gym;
}

// ── Gym ──────────────────────────────────────────────────────

router.post('/', asyncHandler(async (req, res) => {
  const data = validate(GymSchema, req.body, res);
  if (!data) return;
  const gym = await gymService.createGym(sql, req.user.id, {
    name: data.name,
    gymType: data.gym_type,
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    openingHours: data.opening_hours,
    logoUrl: data.logo_url,
  });
  res.status(201).json({ success: true, data: gym });
}));

router.get('/mine', asyncHandler(async (req, res) => {
  const gym = await gymService.getGymByOwnerId(sql, req.user.id);
  if (!gym) return res.json({ success: true, data: null });
  res.json({ success: true, data: gym });
}));

router.patch('/:gymId', asyncHandler(async (req, res) => {
  const gym = await requireGymOwner(req, res);
  if (!gym) return;

  const UpdateGymSchema = GymSchema.partial().extend({
    payment_methods: z.object({
      enabled: z.boolean(),
      options: z.array(z.string()),
    }).optional(),
  });
  const data = validate(UpdateGymSchema, req.body, res);
  if (!data) return;

  const updated = await gymService.updateGym(sql, gym.id, {
    name: data.name,
    gymType: data.gym_type,
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    openingHours: data.opening_hours,
    logoUrl: data.logo_url,
    paymentMethods: data.payment_methods,
  });
  res.json({ success: true, data: updated });
}));

// ── Plans ─────────────────────────────────────────────────────

router.get('/:gymId/plans', asyncHandler(async (req, res) => {
  const gym = await requireGymOwner(req, res);
  if (!gym) return;
  const plans = await planService.listPlans(sql, gym.id);
  res.json({ success: true, data: plans });
}));

router.post('/:gymId/plans', asyncHandler(async (req, res) => {
  const gym = await requireGymOwner(req, res);
  if (!gym) return;
  const data = validate(PlanSchema, req.body, res);
  if (!data) return;
  const plan = await planService.createPlan(sql, gym.id, {
    name: data.name,
    price: data.price,
    durationValue: data.duration_value,
    durationUnit: data.duration_unit,
  });
  res.status(201).json({ success: true, data: plan });
}));

router.delete('/:gymId/plans/:planId', asyncHandler(async (req, res) => {
  const gym = await requireGymOwner(req, res);
  if (!gym) return;
  await planService.deletePlan(sql, req.params.planId, gym.id);
  res.json({ success: true, data: { message: 'Plan deleted' } });
}));

// ── Batches ───────────────────────────────────────────────────

router.get('/:gymId/batches', asyncHandler(async (req, res) => {
  const gym = await requireGymOwner(req, res);
  if (!gym) return;
  const batches = await batchService.listBatches(sql, gym.id);
  res.json({ success: true, data: batches });
}));

router.post('/:gymId/batches', asyncHandler(async (req, res) => {
  const gym = await requireGymOwner(req, res);
  if (!gym) return;
  const data = validate(BatchSchema, req.body, res);
  if (!data) return;
  const batch = await batchService.createBatch(sql, gym.id, {
    name: data.name,
    startTime: data.start_time,
    endTime: data.end_time,
  });
  res.status(201).json({ success: true, data: batch });
}));

router.delete('/:gymId/batches/:batchId', asyncHandler(async (req, res) => {
  const gym = await requireGymOwner(req, res);
  if (!gym) return;
  await batchService.deleteBatch(sql, req.params.batchId, gym.id);
  res.json({ success: true, data: { message: 'Batch deleted' } });
}));

// ── Members ───────────────────────────────────────────────────

router.get('/:gymId/members', asyncHandler(async (req, res) => {
  const gym = await requireGymOwner(req, res);
  if (!gym) return;
  const { search, gender, plan_id, sort } = req.query;
  const members = await memberService.listMembers(sql, gym.id, {
    search: search || undefined,
    gender: gender || undefined,
    planId: plan_id ? Number(plan_id) : undefined,
    sort: sort || 'newest',
  });
  res.json({ success: true, data: members });
}));

router.post('/:gymId/members', asyncHandler(async (req, res) => {
  const gym = await requireGymOwner(req, res);
  if (!gym) return;
  const data = validate(AddMemberSchema, req.body, res);
  if (!data) return;
  const member = await memberService.createMember(sql, gym.id, {
    fullName: data.full_name,
    gender: data.gender,
    phone: data.phone,
    membershipId: data.membership_id,
    planId: data.plan_id,
    batchId: data.batch_id,
    purchaseDate: data.purchase_date,
    paidAmount: data.paid_amount,
    paymentMethod: data.payment_method,
    discount: data.discount,
    admissionFees: data.admission_fees,
    comments: data.comments,
  });
  res.status(201).json({ success: true, data: member });
}));

module.exports = router;
