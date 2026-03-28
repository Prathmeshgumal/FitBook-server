-- FitBook Phase 1: Gym Management
-- Run this migration against your PostgreSQL database.

CREATE TABLE IF NOT EXISTS gyms (
  id              SERIAL PRIMARY KEY,
  owner_id        INTEGER NOT NULL REFERENCES users(id),
  name            TEXT NOT NULL,
  gym_type        TEXT NOT NULL,
  phone           TEXT NOT NULL,
  address         TEXT NOT NULL,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,
  opening_hours   TEXT,
  logo_url        TEXT,
  member_serial   INTEGER NOT NULL DEFAULT 0,
  payment_methods JSONB NOT NULL DEFAULT '{"enabled": false, "options": []}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id              SERIAL PRIMARY KEY,
  gym_id          INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL,
  duration_value  INTEGER NOT NULL,
  duration_unit   TEXT NOT NULL CHECK (duration_unit IN ('months', 'days')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batches (
  id          SERIAL PRIMARY KEY,
  gym_id      INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id              SERIAL PRIMARY KEY,
  gym_id          INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  membership_id   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  gender          TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone           TEXT NOT NULL,
  email           TEXT,
  date_of_birth   DATE,
  address         TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_blocked      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gym_id, membership_id)
);

CREATE TABLE IF NOT EXISTS memberships (
  id              SERIAL PRIMARY KEY,
  member_id       INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id         INTEGER NOT NULL REFERENCES plans(id),
  batch_id        INTEGER REFERENCES batches(id),
  purchase_date   DATE NOT NULL,
  expiry_date     DATE NOT NULL,
  full_amount     NUMERIC(10,2) NOT NULL,
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  admission_fees  NUMERIC(10,2) NOT NULL DEFAULT 0,
  comments        TEXT,
  payment_method  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  membership_id   INTEGER NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  payment_date    DATE NOT NULL,
  payment_method  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
