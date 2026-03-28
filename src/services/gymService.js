/**
 * Generates the XXXX portion of a membership ID from the gym name.
 * Takes the first 4 characters uppercased, padding with '_' if shorter.
 * e.g. "FitBook Gym" -> "FITB", "Pro" -> "PRO_"
 */
function gymPrefix(gymName) {
  const upper = gymName.toUpperCase().replace(/\s+/g, '');
  return upper.substring(0, 4).padEnd(4, '_');
}

/**
 * Formats a serial number as a 4-digit zero-padded string.
 * e.g. 1 -> "0001", 42 -> "0042"
 */
function formatSerial(serial) {
  return String(serial).padStart(4, '0');
}

/**
 * Generates a membership ID from gym name and serial.
 * e.g. ("FitBook Gym", 1) -> "FITB0001"
 */
function generateMembershipId(gymName, serial) {
  return `${gymPrefix(gymName)}${formatSerial(serial)}`;
}

async function createGym(sql, ownerId, { name, gymType, phone, address, city, state, openingHours, logoUrl }) {
  const existing = await getGymByOwnerId(sql, ownerId);
  if (existing) {
    const err = new Error('Gym already exists for this owner');
    err.status = 409;
    throw err;
  }
  const [gym] = await sql`
    INSERT INTO gyms (owner_id, name, gym_type, phone, address, city, state, opening_hours, logo_url)
    VALUES (${ownerId}, ${name}, ${gymType}, ${phone}, ${address}, ${city}, ${state}, ${openingHours ?? null}, ${logoUrl ?? null})
    RETURNING *
  `;
  return gym;
}

async function getGymByOwnerId(sql, ownerId) {
  const [gym] = await sql`SELECT * FROM gyms WHERE owner_id = ${ownerId}`;
  return gym || null;
}

async function getGymById(sql, gymId) {
  const [gym] = await sql`SELECT * FROM gyms WHERE id = ${gymId}`;
  return gym || null;
}

async function updateGym(sql, gymId, { name, gymType, phone, address, city, state, openingHours, logoUrl, paymentMethods }) {
  const fields = {};
  if (name !== undefined) fields.name = name;
  if (gymType !== undefined) fields.gym_type = gymType;
  if (phone !== undefined) fields.phone = phone;
  if (address !== undefined) fields.address = address;
  if (city !== undefined) fields.city = city;
  if (state !== undefined) fields.state = state;
  if (openingHours !== undefined) fields.opening_hours = openingHours;
  if (logoUrl !== undefined) fields.logo_url = logoUrl;
  if (paymentMethods !== undefined) fields.payment_methods = paymentMethods;

  if (Object.keys(fields).length === 0) {
    return getGymById(sql, gymId);
  }

  const [gym] = await sql`
    UPDATE gyms SET ${sql(fields)} WHERE id = ${gymId} RETURNING *
  `;
  return gym;
}

/**
 * Atomically increments member_serial and returns the next value.
 * Used during member creation to generate a unique membership ID.
 */
async function incrementMemberSerial(sql, gymId) {
  const [row] = await sql`
    UPDATE gyms SET member_serial = member_serial + 1
    WHERE id = ${gymId}
    RETURNING member_serial, name
  `;
  return { serial: row.member_serial, gymName: row.name };
}

module.exports = {
  gymPrefix,
  formatSerial,
  generateMembershipId,
  createGym,
  getGymByOwnerId,
  getGymById,
  updateGym,
  incrementMemberSerial,
};
