async function listBatches(sql, gymId) {
  return sql`SELECT * FROM batches WHERE gym_id = ${gymId} AND is_active = TRUE ORDER BY start_time ASC`;
}

async function createBatch(sql, gymId, { name, startTime, endTime }) {
  const [batch] = await sql`
    INSERT INTO batches (gym_id, name, start_time, end_time)
    VALUES (${gymId}, ${name}, ${startTime}, ${endTime})
    RETURNING *
  `;
  return batch;
}

async function getBatchById(sql, batchId) {
  const [batch] = await sql`SELECT * FROM batches WHERE id = ${batchId}`;
  return batch || null;
}

async function deleteBatch(sql, batchId, gymId) {
  const [batch] = await sql`
    UPDATE batches SET is_active = FALSE
    WHERE id = ${batchId} AND gym_id = ${gymId}
    RETURNING *
  `;
  if (!batch) {
    const err = new Error('Batch not found');
    err.status = 404;
    throw err;
  }
  return batch;
}

module.exports = { listBatches, createBatch, getBatchById, deleteBatch };
