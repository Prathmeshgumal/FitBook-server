async function listPlans(sql, gymId) {
  return sql`SELECT * FROM plans WHERE gym_id = ${gymId} AND is_active = TRUE ORDER BY created_at ASC`;
}

async function createPlan(sql, gymId, { name, price, durationValue, durationUnit }) {
  const [plan] = await sql`
    INSERT INTO plans (gym_id, name, price, duration_value, duration_unit)
    VALUES (${gymId}, ${name}, ${price}, ${durationValue}, ${durationUnit})
    RETURNING *
  `;
  return plan;
}

async function getPlanById(sql, planId) {
  const [plan] = await sql`SELECT * FROM plans WHERE id = ${planId}`;
  return plan || null;
}

async function deletePlan(sql, planId, gymId) {
  // Soft-delete: mark inactive rather than hard-delete (preserves membership history)
  const [plan] = await sql`
    UPDATE plans SET is_active = FALSE
    WHERE id = ${planId} AND gym_id = ${gymId}
    RETURNING *
  `;
  if (!plan) {
    const err = new Error('Plan not found');
    err.status = 404;
    throw err;
  }
  return plan;
}

module.exports = { listPlans, createPlan, getPlanById, deletePlan };
