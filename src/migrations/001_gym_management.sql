-- FitBook Phase 1: Gym Management
-- Compatible with existing auth schema (users.id is UUID)

CREATE TABLE IF NOT EXISTS gyms (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  gym_type        TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  address         TEXT        NOT NULL,
  city            TEXT        NOT NULL,
  state           TEXT        NOT NULL,
  opening_hours   TEXT,
  logo_url        TEXT,
  member_serial   INTEGER     NOT NULL DEFAULT 0,
  payment_methods JSONB       NOT NULL DEFAULT '{"enabled": false, "options": []}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  price           NUMERIC(10,2) NOT NULL,
  duration_value  INTEGER     NOT NULL,
  duration_unit   TEXT        NOT NULL CHECK (duration_unit IN ('months', 'days')),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  start_time  TIME        NOT NULL,
  end_time    TIME        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  membership_id   TEXT        NOT NULL,
  full_name       TEXT        NOT NULL,
  gender          TEXT        CHECK (gender IN ('male', 'female', 'other')),
  phone           TEXT        NOT NULL,
  email           TEXT,
  date_of_birth   DATE,
  address         TEXT,
  notes           TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  is_blocked      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gym_id, membership_id)
);

CREATE TABLE IF NOT EXISTS memberships (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id         UUID        NOT NULL REFERENCES plans(id),
  batch_id        UUID        REFERENCES batches(id),
  purchase_date   DATE        NOT NULL,
  expiry_date     DATE        NOT NULL,
  full_amount     NUMERIC(10,2) NOT NULL,
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  admission_fees  NUMERIC(10,2) NOT NULL DEFAULT 0,
  comments        TEXT,
  payment_method  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id   UUID        NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  payment_date    DATE        NOT NULL,
  payment_method  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_gyms_owner_id        ON gyms(owner_id);
CREATE INDEX IF NOT EXISTS idx_plans_gym_id         ON plans(gym_id);
CREATE INDEX IF NOT EXISTS idx_batches_gym_id       ON batches(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_id       ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_phone        ON members(phone);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_membership_id ON payments(membership_id);
