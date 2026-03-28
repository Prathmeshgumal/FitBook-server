const { incrementMemberSerial, generateMembershipId } = require('./gymService');

async function listMembers(sql, gymId, { search, gender, planId, sort } = {}) {
  // Build dynamic query with optional filters
  const members = await sql`
    SELECT
      m.*,
      ms.id           AS membership_id_fk,
      ms.plan_id,
      ms.batch_id,
      ms.expiry_date,
      ms.full_amount,
      ms.discount,
      ms.admission_fees,
      ms.purchase_date,
      p.name          AS plan_name,
      b.name          AS batch_name,
      COALESCE(
        ms.full_amount - ms.discount - COALESCE(SUM(pay.amount), 0), 0
      )               AS due_amount
    FROM members m
    LEFT JOIN LATERAL (
      SELECT * FROM memberships WHERE member_id = m.id ORDER BY created_at DESC LIMIT 1
    ) ms ON TRUE
    LEFT JOIN plans p ON p.id = ms.plan_id
    LEFT JOIN batches b ON b.id = ms.batch_id
    LEFT JOIN payments pay ON pay.membership_id = ms.id
    WHERE m.gym_id = ${gymId}
      AND m.is_active = TRUE
      ${search ? sql`AND (m.full_name ILIKE ${'%' + search + '%'} OR m.phone LIKE ${'%' + search + '%'})` : sql``}
      ${gender ? sql`AND m.gender = ${gender}` : sql``}
      ${planId ? sql`AND ms.plan_id = ${planId}` : sql``}
    GROUP BY m.id, ms.id, ms.plan_id, ms.batch_id, ms.expiry_date,
             ms.full_amount, ms.discount, ms.admission_fees, ms.purchase_date,
             p.name, b.name
    ORDER BY ${sort === 'oldest' ? sql`m.created_at ASC` : sql`m.created_at DESC`}
  `;
  return members;
}

async function createMember(sql, gymId, {
  fullName, gender, phone, membershipId,
  planId, batchId, purchaseDate, paidAmount,
  paymentMethod, discount, admissionFees, comments,
}) {
  // Resolve membership ID: if not provided, auto-generate
  let resolvedMembershipId = membershipId;
  if (!resolvedMembershipId) {
    const { serial, gymName } = await incrementMemberSerial(sql, gymId);
    resolvedMembershipId = generateMembershipId(gymName, serial);
  }

  // Check uniqueness
  const [existing] = await sql`
    SELECT id FROM members WHERE gym_id = ${gymId} AND membership_id = ${resolvedMembershipId}
  `;
  if (existing) {
    const err = new Error('Membership ID already in use');
    err.status = 409;
    throw err;
  }

  // Fetch plan to compute expiry date
  const [plan] = await sql`SELECT * FROM plans WHERE id = ${planId}`;
  if (!plan) {
    const err = new Error('Plan not found');
    err.status = 404;
    throw err;
  }

  const purchase = new Date(purchaseDate);
  const expiry = computeExpiryDate(purchase, plan.duration_value, plan.duration_unit);

  const member = await sql.begin(async (tx) => {
    const [newMember] = await tx`
      INSERT INTO members (gym_id, membership_id, full_name, gender, phone)
      VALUES (${gymId}, ${resolvedMembershipId}, ${fullName}, ${gender ?? null}, ${phone})
      RETURNING *
    `;

    await tx`
      INSERT INTO memberships (
        member_id, plan_id, batch_id, purchase_date, expiry_date,
        full_amount, discount, admission_fees, comments, payment_method
      ) VALUES (
        ${newMember.id}, ${planId}, ${batchId ?? null}, ${purchaseDate}, ${expiry.toISOString().split('T')[0]},
        ${plan.price}, ${discount ?? 0}, ${admissionFees ?? 0}, ${comments ?? null}, ${paymentMethod ?? null}
      )
    `;

    if (paidAmount && Number(paidAmount) > 0) {
      const [ms] = await tx`SELECT id FROM memberships WHERE member_id = ${newMember.id} ORDER BY created_at DESC LIMIT 1`;
      await tx`
        INSERT INTO payments (membership_id, amount, payment_date, payment_method)
        VALUES (${ms.id}, ${paidAmount}, ${purchaseDate}, ${paymentMethod ?? null})
      `;
    }

    return newMember;
  });

  return member;
}

async function getMemberById(sql, memberId) {
  const [member] = await sql`SELECT * FROM members WHERE id = ${memberId} AND is_active = TRUE`;
  return member || null;
}

async function getMemberDetail(sql, memberId) {
  const [member] = await sql`SELECT * FROM members WHERE id = ${memberId} AND is_active = TRUE`;
  if (!member) return null;

  const memberships = await sql`
    SELECT
      ms.*,
      p.name          AS plan_name,
      p.duration_value,
      p.duration_unit,
      b.name          AS batch_name,
      COALESCE(SUM(pay.amount), 0) AS total_paid
    FROM memberships ms
    JOIN plans p ON p.id = ms.plan_id
    LEFT JOIN batches b ON b.id = ms.batch_id
    LEFT JOIN payments pay ON pay.membership_id = ms.id
    WHERE ms.member_id = ${memberId}
    GROUP BY ms.id, p.name, p.duration_value, p.duration_unit, b.name
    ORDER BY ms.created_at DESC
  `;

  const paymentsPerMembership = await Promise.all(
    memberships.map(async (ms) => {
      const pays = await sql`
        SELECT * FROM payments WHERE membership_id = ${ms.id} ORDER BY payment_date DESC
      `;
      return { ...ms, payments: pays };
    })
  );

  return { ...member, memberships: paymentsPerMembership };
}

async function updateMember(sql, memberId, fields) {
  const allowed = ['full_name', 'gender', 'phone', 'email', 'date_of_birth', 'address', 'notes', 'is_blocked'];
  const update = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) update[key] = fields[key];
  }
  if (Object.keys(update).length === 0) return getMemberById(sql, memberId);

  const [member] = await sql`
    UPDATE members SET ${sql(update)} WHERE id = ${memberId} RETURNING *
  `;
  return member;
}

async function deleteMember(sql, memberId, gymId) {
  const [member] = await sql`
    UPDATE members SET is_active = FALSE
    WHERE id = ${memberId} AND gym_id = ${gymId}
    RETURNING *
  `;
  if (!member) {
    const err = new Error('Member not found');
    err.status = 404;
    throw err;
  }
  return member;
}

function computeExpiryDate(purchaseDate, durationValue, durationUnit) {
  const expiry = new Date(purchaseDate);
  if (durationUnit === 'months') {
    expiry.setMonth(expiry.getMonth() + durationValue);
    // Adjust for month-end overflow (e.g. Jan 31 + 1 month = Feb 28)
    expiry.setDate(expiry.getDate() - 1);
  } else {
    expiry.setDate(expiry.getDate() + durationValue - 1);
  }
  return expiry;
}

module.exports = {
  listMembers,
  createMember,
  getMemberById,
  getMemberDetail,
  updateMember,
  deleteMember,
  computeExpiryDate,
};
