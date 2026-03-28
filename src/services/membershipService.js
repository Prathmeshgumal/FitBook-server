const { computeExpiryDate } = require('./memberService');

async function addMembership(sql, memberId, {
  planId, batchId, purchaseDate, paidAmount,
  paymentMethod, discount, admissionFees, comments,
}) {
  const [plan] = await sql`SELECT * FROM plans WHERE id = ${planId}`;
  if (!plan) {
    const err = new Error('Plan not found');
    err.status = 404;
    throw err;
  }

  const purchase = new Date(purchaseDate);
  const expiry = computeExpiryDate(purchase, plan.duration_value, plan.duration_unit);

  const membership = await sql.begin(async (tx) => {
    const [ms] = await tx`
      INSERT INTO memberships (
        member_id, plan_id, batch_id, purchase_date, expiry_date,
        full_amount, discount, admission_fees, comments, payment_method
      ) VALUES (
        ${memberId}, ${planId}, ${batchId ?? null}, ${purchaseDate},
        ${expiry.toISOString().split('T')[0]},
        ${plan.price}, ${discount ?? 0}, ${admissionFees ?? 0},
        ${comments ?? null}, ${paymentMethod ?? null}
      )
      RETURNING *
    `;

    if (paidAmount && Number(paidAmount) > 0) {
      await tx`
        INSERT INTO payments (membership_id, amount, payment_date, payment_method)
        VALUES (${ms.id}, ${paidAmount}, ${purchaseDate}, ${paymentMethod ?? null})
      `;
    }

    return ms;
  });

  return membership;
}

async function addPayment(sql, membershipId, { amount, paymentDate, paymentMethod }) {
  const [payment] = await sql`
    INSERT INTO payments (membership_id, amount, payment_date, payment_method)
    VALUES (${membershipId}, ${amount}, ${paymentDate}, ${paymentMethod ?? null})
    RETURNING *
  `;
  return payment;
}

async function deletePayment(sql, paymentId, gymId) {
  // Verify the payment belongs to the gym before deleting
  const [payment] = await sql`
    SELECT pay.id
    FROM payments pay
    JOIN memberships ms ON ms.id = pay.membership_id
    JOIN members m ON m.id = ms.member_id
    WHERE pay.id = ${paymentId} AND m.gym_id = ${gymId}
  `;
  if (!payment) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }
  await sql`DELETE FROM payments WHERE id = ${paymentId}`;
}

module.exports = { addMembership, addPayment, deletePayment };
