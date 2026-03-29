const { Router } = require('express');
const sql = require('../db');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

// Public dashboard statistics - no auth required
router.get('/stats', asyncHandler(async (req, res) => {
  // Total gyms
  const [gymsResult] = await sql`SELECT COUNT(*) as total FROM gyms`;
  
  // Total members (active only)
  const [membersResult] = await sql`SELECT COUNT(*) as total FROM members WHERE is_active = TRUE`;
  
  // Total active memberships (not expired)
  const [activeMembershipsResult] = await sql`
    SELECT COUNT(*) as total FROM memberships 
    WHERE expiry_date >= CURRENT_DATE
  `;
  
  // Total revenue (sum of all payments)
  const [revenueResult] = await sql`SELECT COALESCE(SUM(amount), 0) as total FROM payments`;
  
  // Gyms by type
  const gymsByType = await sql`
    SELECT gym_type, COUNT(*) as count 
    FROM gyms 
    GROUP BY gym_type 
    ORDER BY count DESC
  `;
  
  // Members by gender
  const membersByGender = await sql`
    SELECT gender, COUNT(*) as count 
    FROM members 
    WHERE is_active = TRUE AND gender IS NOT NULL
    GROUP BY gender
  `;
  
  // Recent gyms (last 10)
  const recentGyms = await sql`
    SELECT id, name, city, state, gym_type, created_at 
    FROM gyms 
    ORDER BY created_at DESC 
    LIMIT 10
  `;
  
  // Memberships expiring soon (next 7 days)
  const expiringSoon = await sql`
    SELECT COUNT(*) as total 
    FROM memberships 
    WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  `;
  
  // Monthly signups (last 6 months)
  const monthlySignups = await sql`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as count
    FROM members
    WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month ASC
  `;
  
  // Popular plans
  const popularPlans = await sql`
    SELECT p.name, p.price, COUNT(ms.id) as subscription_count
    FROM plans p
    LEFT JOIN memberships ms ON ms.plan_id = p.id
    WHERE p.is_active = TRUE
    GROUP BY p.id, p.name, p.price
    ORDER BY subscription_count DESC
    LIMIT 5
  `;

  res.json({
    success: true,
    data: {
      totals: {
        gyms: parseInt(gymsResult.total),
        members: parseInt(membersResult.total),
        activeMemberships: parseInt(activeMembershipsResult.total),
        revenue: parseFloat(revenueResult.total),
        expiringSoon: parseInt(expiringSoon[0]?.total || 0),
      },
      gymsByType,
      membersByGender,
      recentGyms,
      monthlySignups,
      popularPlans,
    },
  });
}));

// Get all gyms list for public view
router.get('/gyms', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, city, state } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  const gyms = await sql`
    SELECT 
      g.id, g.name, g.gym_type, g.city, g.state, g.phone, g.created_at,
      (SELECT COUNT(*) FROM members m WHERE m.gym_id = g.id AND m.is_active = TRUE) as member_count,
      (SELECT COUNT(*) FROM plans p WHERE p.gym_id = g.id AND p.is_active = TRUE) as plan_count
    FROM gyms g
    WHERE 1=1
      ${search ? sql`AND (g.name ILIKE ${'%' + search + '%'} OR g.city ILIKE ${'%' + search + '%'})` : sql``}
      ${city ? sql`AND g.city = ${city}` : sql``}
      ${state ? sql`AND g.state = ${state}` : sql``}
    ORDER BY g.created_at DESC
    LIMIT ${parseInt(limit)}
    OFFSET ${offset}
  `;
  
  const [countResult] = await sql`
    SELECT COUNT(*) as total FROM gyms g
    WHERE 1=1
      ${search ? sql`AND (g.name ILIKE ${'%' + search + '%'} OR g.city ILIKE ${'%' + search + '%'})` : sql``}
      ${city ? sql`AND g.city = ${city}` : sql``}
      ${state ? sql`AND g.state = ${state}` : sql``}
  `;
  
  res.json({
    success: true,
    data: {
      gyms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.total),
        totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit)),
      },
    },
  });
}));

module.exports = router;
