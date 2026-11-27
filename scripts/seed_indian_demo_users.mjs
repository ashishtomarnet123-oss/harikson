#!/usr/bin/env node
/**
 * Seeder: 1,572 Realistic Synthetic Indian Demo Users + Subscriptions + Invoices + Activity Logs
 *
 * Idempotent: cleans up any previous rows tagged with `demo_indian_dataset` before inserting
 * so re-running produces an exact, clean dataset of 1,572 demo users without touching
 * existing platform/admin accounts.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." node scripts/seed_indian_demo_users.mjs
 */

import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let pg;
try {
  pg = require('pg');
} catch {
  pg = require('../admin-api/node_modules/pg');
}
const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://neuravolt:neuravolt_dev_pwd@127.0.0.1:5435/neuravolt';

// Deterministic PRNG (Mulberry32) so dataset is reproducible & realistic
function createRng(seed = 20261127) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(20261127);
const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

// 85+ Authentic Indian First Names
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Dhruv', 'Kabir', 'Ritvik', 'Rohan', 'Vikram', 'Siddharth', 'Karthik', 'Pranav',
  'Nikhil', 'Varun', 'Harsh', 'Mayank', 'Abhishek', 'Manish', 'Gaurav', 'Deepak', 'Rajesh', 'Suresh',
  'Amit', 'Rahul', 'Kunal', 'Tushar', 'Yash', 'Dev', 'Parth', 'Vedant', 'Aryan', 'Pranay',
  'Shubham', 'Tarun', 'Akash', 'Vishal', 'Saurabh', 'Ankit', 'Mohit', 'Sahil', 'Piyush', 'Ashwin',
  'Ananya', 'Diya', 'Sanya', 'Myra', 'Aadhya', 'Ira', 'Navya', 'Pari', 'Riya', 'Anika',
  'Kavya', 'Meera', 'Tanvi', 'Ishita', 'Shruti', 'Pooja', 'Neha', 'Priya', 'Sneha', 'Swati',
  'Divya', 'Nisha', 'Shreya', 'Kriti', 'Sakshi', 'Ankita', 'Pallavi', 'Nandini', 'Aditi', 'Bhavna',
  'Ritu', 'Simran', 'Komal', 'Madhuri', 'Smita'
];

// 80+ Authentic Indian Surnames
const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Mehta', 'Shah', 'Joshi', 'Kulkarni', 'Deshmukh', 'Iyer',
  'Nair', 'Menon', 'Reddy', 'Naidu', 'Rao', 'Choudhary', 'Agarwal', 'Bansal', 'Garg', 'Singhal',
  'Jain', 'Malhotra', 'Kapoor', 'Khanna', 'Bhatia', 'Sethi', 'Chopra', 'Sinha', 'Mishra', 'Tiwari',
  'Pandey', 'Dubey', 'Shukla', 'Tripathi', 'Yadav', 'Rajput', 'Chauhan', 'Rathore', 'Solanki', 'Jadeja',
  'Parmar', 'Chatterjee', 'Banerjee', 'Mukherjee', 'Bose', 'Ghosh', 'Sen', 'Das', 'Dutta', 'Roy',
  'Sengupta', 'Patil', 'Pawar', 'Shinde', 'Jadhav', 'Gaikwad', 'Gokhale', 'Krishnan', 'Subramanian', 'Pillai',
  'Hegde', 'Shetty', 'Kamath', 'Bhat', 'Gowda', 'Murthy', 'Sundaram', 'Narayanan', 'Saxena', 'Srivastava',
  'Rastogi', 'Mathur', 'Bhargava', 'Kaul', 'Raina', 'Bakshi', 'Bedi', 'Bajaj', 'Goel', 'Mittal'
];

const CITIES = [
  { city: 'Delhi', state: 'Delhi', weight: 10 },
  { city: 'Mumbai', state: 'Maharashtra', weight: 12 },
  { city: 'Bengaluru', state: 'Karnataka', weight: 14 },
  { city: 'Hyderabad', state: 'Telangana', weight: 10 },
  { city: 'Ahmedabad', state: 'Gujarat', weight: 6 },
  { city: 'Pune', state: 'Maharashtra', weight: 9 },
  { city: 'Jaipur', state: 'Rajasthan', weight: 5 },
  { city: 'Lucknow', state: 'Uttar Pradesh', weight: 4 },
  { city: 'Kolkata', state: 'West Bengal', weight: 7 },
  { city: 'Chennai', state: 'Tamil Nadu', weight: 8 },
  { city: 'Chandigarh', state: 'Chandigarh', weight: 3 },
  { city: 'Gurugram', state: 'Haryana', weight: 6 },
  { city: 'Noida', state: 'Uttar Pradesh', weight: 6 },
  { city: 'Indore', state: 'Madhya Pradesh', weight: 4 },
  { city: 'Surat', state: 'Gujarat', weight: 4 },
  { city: 'Kochi', state: 'Kerala', weight: 3 },
  { city: 'Vadodara', state: 'Gujarat', weight: 2 },
  { city: 'Nagpur', state: 'Maharashtra', weight: 2 },
  { city: 'Coimbatore', state: 'Tamil Nadu', weight: 3 },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', weight: 2 },
  { city: 'Bhubaneswar', state: 'Odisha', weight: 2 },
  { city: 'Thiruvananthapuram', state: 'Kerala', weight: 2 },
  { city: 'Bhopal', state: 'Madhya Pradesh', weight: 2 },
  { city: 'Patna', state: 'Bihar', weight: 2 },
];

const WEIGHTED_CITIES = CITIES.flatMap((c) => Array(c.weight).fill({ city: c.city, state: c.state }));

const PROFESSIONS = [
  { designation: 'Founder & CEO', department: 'Executive', companySuffix: ['Technologies Pvt Ltd', 'Labs', 'AI Solutions', 'Ventures'] },
  { designation: 'Business Owner', department: 'Management', companySuffix: ['Enterprises', 'Trading Co', 'Industries', 'Retail Group'] },
  { designation: 'Growth Marketing Lead', department: 'Marketing', companySuffix: ['Digital Media', 'Growth Studio', 'BrandWorks', 'Marketing Hub'] },
  { designation: 'Agency Director', department: 'Client Services', companySuffix: ['Creative Agency', 'Digital Partners', 'Media Solutions', 'Interactive'] },
  { designation: 'Senior Software Engineer', department: 'Engineering', companySuffix: ['Systems Pvt Ltd', 'CloudTech', 'SoftWorks', 'Infotech'] },
  { designation: 'Independent Freelancer', department: 'Consulting', companySuffix: ['Independent Practice', 'Freelance Studio', 'Solo Consulting'] },
  { designation: 'Management Consultant', department: 'Advisory', companySuffix: ['Advisory Partners', 'Strategy Group', 'Consulting LLP'] },
  { designation: 'E-commerce Manager', department: 'E-commerce', companySuffix: ['Kart Commerce', 'Direct Brands', 'Retail Pvt Ltd', 'Bazaar Online'] },
  { designation: 'VP of Operations', department: 'Enterprise Operations', companySuffix: ['Global Corp', 'Enterprise Systems', 'InfraTech Ltd'] },
  { designation: 'Product Designer', department: 'Design', companySuffix: ['Design Co', 'UX Collective', 'Product Studio'] },
  { designation: 'Graduate Student', department: 'Academic', companySuffix: ['University Research', 'Independent Learner'] },
];

const COMPANY_PREFIXES = [
  'Bharat', 'Indus', 'Nava', 'Kaveri', 'Veda', 'Surya', 'Deccan', 'Zenith', 'Pragati', 'Nirman',
  'Shakti', 'Aarohan', 'Sankalp', 'Lakshya', 'Tarang', 'Uday', 'Tejas', 'Kiran', 'Vikas', 'Samridhi',
  'Apex', 'Nova', 'Pulse', 'Vertex', 'Cloud', 'Pixel', 'Metric', 'Scale', 'Bridge', 'Spark',
  'Aether', 'Core', 'NextGen', 'Omni', 'Prime', 'Vanguard', 'Matrix', 'Orbit', 'Crest', 'Summit'
];

const PROVIDERS = ['razorpay', 'razorpay', 'razorpay', 'cashfree', 'phonepe', 'stripe'];

// Exact target distribution totaling 1,572 users
const PLAN_TARGETS = [
  { planId: 'free', count: 420 },
  { planId: 'starter', count: 580 },
  { planId: 'professional', count: 432 },
  { planId: 'enterprise', count: 140 },
]; // Sum = 1,572

function generateUniqueNames(total) {
  const combos = [];
  for (const fn of FIRST_NAMES) {
    for (const ln of LAST_NAMES) {
      combos.push({ firstName: fn, lastName: ln, fullName: `${fn} ${ln}` });
    }
  }
  // Fisher-Yates shuffle
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }
  return combos.slice(0, total);
}

async function batchInsert(client, table, columns, rows, batchSize = 200) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values = [];
    const placeholders = chunk.map((row, rIdx) => {
      const rowPlaceholders = columns.map((_, cIdx) => {
        values.push(row[cIdx]);
        return `$${rIdx * columns.length + cIdx + 1}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    });
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`;
    await client.query(sql, values);
  }
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('Connecting to database and loading configured plans...');
    const plansRes = await client.query(
      'SELECT id, name, tier, price, billing, currency, trial_days, token_limit, agent_limit, storage_limit_gb, image_limit_monthly FROM plans'
    );
    const planMap = {};
    for (const p of plansRes.rows) {
      planMap[p.id] = {
        ...p,
        price: parseFloat(p.price),
      };
    }

    for (const target of PLAN_TARGETS) {
      if (!planMap[target.planId]) {
        throw new Error(`Configured plan "${target.planId}" not found in plans table.`);
      }
    }

    await client.query('BEGIN');

    // Clean up any previous demo_indian_dataset rows idempotently
    console.log('Cleaning up any previous demo_indian_dataset records...');
    const oldTenantsRes = await client.query(
      `SELECT DISTINCT tenant_id FROM users WHERE settings->>'source' = 'demo_indian_dataset'`
    );
    if (oldTenantsRes.rows.length > 0) {
      const oldTenantIds = oldTenantsRes.rows.map((r) => r.tenant_id);
      await client.query(`DELETE FROM activity_logs WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM invoices WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM subscriptions WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM users WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [oldTenantIds]);
    }

    const TOTAL_USERS = 1572;
    const uniqueNames = generateUniqueNames(TOTAL_USERS);
    const now = new Date();
    // Static precomputed bcrypt hash for demo accounts (not used for login, realistic format)
    const demoPasswordHash = '$2b$10$DemoSyntheticIndianUserHash000000000000000000000000000';

    // Build flat plan assignment list of 1,572 entries and shuffle
    const planPool = [];
    for (const target of PLAN_TARGETS) {
      for (let i = 0; i < target.count; i++) {
        planPool.push(target.planId);
      }
    }
    for (let i = planPool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [planPool[i], planPool[j]] = [planPool[j], planPool[i]];
    }

    const tenantRows = [];
    const userRows = [];
    const subRows = [];
    const invoiceRows = [];
    const activityRows = [];

    let invoiceSeq = 10001;

    const stats = {
      totalUsers: 0,
      byPlan: {},
      byStatus: {},
      byBilling: { monthly: 0, annual: 0, free: 0 },
      invoicesByStatus: {},
      collectedRevenueINR: 0,
      refundedINR: 0,
    };

    for (let idx = 0; idx < TOTAL_USERS; idx++) {
      const person = uniqueNames[idx];
      const planId = planPool[idx];
      const plan = planMap[planId];
      const loc = pick(WEIGHTED_CITIES);
      const prof = pick(PROFESSIONS);
      const companyPrefix = pick(COMPANY_PREFIXES);
      const companyName =
        prof.designation === 'Independent Freelancer' || prof.designation === 'Graduate Student'
          ? `${person.fullName} ${pick(prof.companySuffix)}`
          : `${companyPrefix} ${pick(prof.companySuffix)}`;

      const tenantId = crypto.randomUUID();
      const userId = crypto.randomUUID();

      const slugBase = `${person.firstName.toLowerCase()}-${person.lastName.toLowerCase()}-${idx + 1}`;
      const email = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}.${idx + 1}@example.test`;
      const username = `${person.firstName.toLowerCase()}_${person.lastName.toLowerCase()}_${idx + 1}`;
      const phone = `+91-9${String(100000000 + randInt(0, 899999999)).padStart(9, '0')}`;
      const initials = `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();

      // Registration date spread over last 12 months (weighted slightly toward recent months)
      const daysAgo = Math.floor(Math.pow(rng(), 1.25) * 355) + 1;
      const registeredAt = new Date(now.getTime() - daysAgo * 86400000);
      const lastLoginDaysAgo = randInt(0, Math.min(daysAgo, 25));
      const lastLoginAt = new Date(now.getTime() - lastLoginDaysAgo * 86400000);

      // Account status
      const accountRoll = rng();
      const accountStatus = accountRoll < 0.93 ? 'active' : accountRoll < 0.97 ? 'suspended' : 'pending';

      // Determine subscription status & billing cycle
      let subStatus = 'active';
      let billingCycle = 'monthly';
      let subAmount = plan.price;

      if (planId === 'free') {
        stats.byBilling.free++;
        const r = rng();
        subStatus = r < 0.22 ? 'trialing' : 'active';
        billingCycle = 'monthly';
        subAmount = 0;
      } else {
        const cycleRoll = rng();
        billingCycle = cycleRoll < 0.28 ? 'annual' : 'monthly';
        stats.byBilling[billingCycle]++;
        subAmount = billingCycle === 'annual' ? plan.price * 10 : plan.price;

        const stRoll = rng();
        if (daysAgo <= 14 && stRoll < 0.45) {
          subStatus = 'trialing';
        } else if (stRoll < 0.74) {
          subStatus = 'active';
        } else if (stRoll < 0.82) {
          subStatus = 'trialing';
        } else if (stRoll < 0.89) {
          subStatus = 'cancelled';
        } else if (stRoll < 0.95) {
          subStatus = 'past_due';
        } else {
          subStatus = 'expired';
        }
      }

      stats.byPlan[planId] = (stats.byPlan[planId] || 0) + 1;
      stats.byStatus[subStatus] = (stats.byStatus[subStatus] || 0) + 1;

      const periodDays = billingCycle === 'annual' ? 365 : 30;
      let subStart = new Date(registeredAt.getTime());
      let currentPeriodStart = new Date(subStart.getTime());
      let currentPeriodEnd = new Date(currentPeriodStart.getTime() + periodDays * 86400000);
      let cancelledAt = null;
      let expiredAt = null;
      let trialStart = null;
      let trialEnd = null;
      let renewalCount = 0;

      if (subStatus === 'trialing') {
        trialStart = new Date(now.getTime() - randInt(1, 12) * 86400000);
        trialEnd = new Date(trialStart.getTime() + (plan.trial_days || 14) * 86400000);
        currentPeriodStart = trialStart;
        currentPeriodEnd = trialEnd;
      } else if (planId !== 'free') {
        // Advance billing cycles up to now
        while (currentPeriodEnd < now && subStatus !== 'expired') {
          renewalCount++;
          currentPeriodStart = new Date(currentPeriodEnd.getTime());
          currentPeriodEnd = new Date(currentPeriodStart.getTime() + periodDays * 86400000);
        }
        if (subStatus === 'cancelled') {
          cancelledAt = new Date(
            Math.max(subStart.getTime() + 5 * 86400000, now.getTime() - randInt(2, 45) * 86400000)
          );
          if (cancelledAt > now) cancelledAt = new Date(now.getTime() - 2 * 86400000);
        } else if (subStatus === 'expired') {
          expiredAt = new Date(now.getTime() - randInt(2, 40) * 86400000);
          currentPeriodEnd = expiredAt;
          currentPeriodStart = new Date(expiredAt.getTime() - periodDays * 86400000);
        }
      }

      // Upgrade/downgrade history for realism
      const upgradeHistory = [];
      const downgradeHistory = [];
      if (planId === 'professional' && rng() < 0.25 && daysAgo > 45) {
        upgradeHistory.push({
          from_plan: 'starter',
          to_plan: 'professional',
          changed_at: new Date(registeredAt.getTime() + 30 * 86400000).toISOString(),
        });
      } else if (planId === 'enterprise' && rng() < 0.3 && daysAgo > 60) {
        upgradeHistory.push({
          from_plan: 'professional',
          to_plan: 'enterprise',
          changed_at: new Date(registeredAt.getTime() + 30 * 86400000).toISOString(),
        });
      } else if (planId === 'starter' && rng() < 0.08 && daysAgo > 60) {
        downgradeHistory.push({
          from_plan: 'professional',
          to_plan: 'starter',
          changed_at: new Date(registeredAt.getTime() + 35 * 86400000).toISOString(),
        });
      }

      const usageStats = {
        conversations_count: randInt(planId === 'free' ? 1 : 5, planId === 'enterprise' ? 240 : 85),
        messages_count: randInt(planId === 'free' ? 4 : 20, planId === 'enterprise' ? 1800 : 520),
        tokens_used: randInt(500, plan.token_limit > 0 ? plan.token_limit : 250000),
        storage_used_mb: randInt(5, Math.min(plan.storage_limit_gb * 400, 15000)),
      };

      const tenantName = `${companyName} (${loc.city})`;
      const tenantStatus = accountStatus === 'suspended' ? 'suspended' : 'active';

      tenantRows.push([
        tenantId,
        tenantName,
        slugBase,
        planId,
        tenantStatus,
        registeredAt,
        now,
      ]);

      userRows.push([
        userId,
        tenantId,
        email,
        demoPasswordHash,
        'owner',
        accountStatus,
        true,
        person.fullName,
        username,
        phone,
        companyName,
        prof.designation,
        prof.department,
        'IN',
        `${prof.designation} based in ${loc.city}, ${loc.state}.`,
        JSON.stringify({
          source: 'demo_indian_dataset',
          city: loc.city,
          state: loc.state,
          initials,
          last_login_at: lastLoginAt.toISOString(),
          usage_stats: usageStats,
          entitlements: {
            token_limit: plan.token_limit,
            agent_limit: plan.agent_limit,
            storage_limit_gb: plan.storage_limit_gb,
            image_limit_monthly: plan.image_limit_monthly,
          },
        }),
        JSON.stringify({
          city: loc.city,
          state: loc.state,
          country: 'IN',
          plan_id: planId,
          billing_cycle: billingCycle,
        }),
        registeredAt,
        lastLoginAt,
      ]);

      const provider = pick(PROVIDERS);
      const subId = crypto.randomUUID();

      if (planId !== 'free' || subStatus === 'trialing') {
        subRows.push([
          subId,
          tenantId,
          provider,
          `sub_demo_${slugBase}`,
          planId,
          subStatus,
          currentPeriodStart,
          currentPeriodEnd,
          subAmount,
          'INR',
          JSON.stringify({
            source: 'demo_indian_dataset',
            billing_cycle: billingCycle,
            trial_start: trialStart ? trialStart.toISOString() : null,
            trial_end: trialEnd ? trialEnd.toISOString() : null,
            cancelled_at: cancelledAt ? cancelledAt.toISOString() : null,
            expired_at: expiredAt ? expiredAt.toISOString() : null,
            renewal_count: renewalCount,
            upgrade_history: upgradeHistory,
            downgrade_history: downgradeHistory,
          }),
          subStart,
          cancelledAt || expiredAt || now,
        ]);
      }

      // Generate historical + current invoices for paid plans (non-trialing or converted)
      if (planId !== 'free' && subStatus !== 'trialing') {
        const numCycles = Math.max(
          1,
          billingCycle === 'annual'
            ? 1
            : Math.min(12, Math.max(1, Math.floor((now.getTime() - subStart.getTime()) / (30 * 86400000)) + 1))
        );

        for (let c = 0; c < numCycles; c++) {
          const cycleDate = new Date(subStart.getTime() + c * periodDays * 86400000);
          if (cycleDate > now) break;
          if (cancelledAt && cycleDate > cancelledAt) break;

          const isLatestCycle = c === numCycles - 1;
          let invStatus = 'paid';
          if (isLatestCycle && subStatus === 'past_due') {
            invStatus = rng() < 0.55 ? 'failed' : 'pending';
          } else if (isLatestCycle && subStatus === 'expired') {
            invStatus = 'unpaid';
          } else if (!isLatestCycle && rng() < 0.03) {
            invStatus = 'failed';
          } else if (rng() < 0.025) {
            invStatus = 'refunded';
          }

          const invId = crypto.randomUUID();
          const invNumber = `INV-IN-${String(invoiceSeq++).padStart(6, '0')}`;
          const providerInvId = `pay_in_${crypto.randomBytes(6).toString('hex')}`;
          const totalAmt = subAmount;
          const subtotalAmt = Math.round((totalAmt / 1.18) * 100) / 100;
          const taxAmt = Math.round((totalAmt - subtotalAmt) * 100) / 100;
          const paidAt = invStatus === 'paid' || invStatus === 'refunded' ? cycleDate : null;

          stats.invoicesByStatus[invStatus] = (stats.invoicesByStatus[invStatus] || 0) + 1;
          if (invStatus === 'paid') stats.collectedRevenueINR += totalAmt;
          if (invStatus === 'refunded') stats.refundedINR += totalAmt;

          invoiceRows.push([
            invId,
            tenantId,
            subId,
            provider,
            providerInvId,
            totalAmt,
            subtotalAmt,
            taxAmt,
            totalAmt,
            'INR',
            invStatus,
            paidAt,
            invNumber,
            cycleDate,
            cycleDate,
          ]);
        }
      }

      // Account activity records
      activityRows.push([
        crypto.randomUUID(),
        tenantId,
        userId,
        'user_registered',
        JSON.stringify({ city: loc.city, state: loc.state, plan: planId, source: 'demo_indian_dataset' }),
        `103.${randInt(10, 240)}.${randInt(1, 254)}.${randInt(1, 254)}`,
        registeredAt,
      ]);

      if (planId !== 'free') {
        activityRows.push([
          crypto.randomUUID(),
          tenantId,
          userId,
          subStatus === 'cancelled' ? 'subscription_cancelled' : 'subscription_active',
          JSON.stringify({ plan_id: planId, billing_cycle: billingCycle, amount: subAmount, currency: 'INR' }),
          `103.${randInt(10, 240)}.${randInt(1, 254)}.${randInt(1, 254)}`,
          cancelledAt || currentPeriodStart,
        ]);
      }

      activityRows.push([
        crypto.randomUUID(),
        tenantId,
        userId,
        'user_login',
        JSON.stringify({ city: loc.city, state: loc.state }),
        `103.${randInt(10, 240)}.${randInt(1, 254)}.${randInt(1, 254)}`,
        lastLoginAt,
      ]);

      stats.totalUsers++;
    }

    console.log(`Inserting ${tenantRows.length} tenants...`);
    await batchInsert(
      client,
      'tenants',
      ['id', 'name', 'slug', 'plan', 'status', 'created_at', 'updated_at'],
      tenantRows
    );

    console.log(`Inserting ${userRows.length} users...`);
    await batchInsert(
      client,
      'users',
      [
        'id', 'tenant_id', 'email', 'password_hash', 'role', 'status', 'email_verified',
        'name', 'username', 'phone', 'company', 'job_title', 'department', 'country',
        'bio', 'settings', 'billing_info', 'created_at', 'updated_at',
      ],
      userRows
    );

    console.log(`Inserting ${subRows.length} subscriptions...`);
    await batchInsert(
      client,
      'subscriptions',
      [
        'id', 'tenant_id', 'provider', 'provider_subscription_id', 'plan_id', 'status',
        'current_period_start', 'current_period_end', 'amount', 'currency', 'metadata',
        'created_at', 'updated_at',
      ],
      subRows
    );

    console.log(`Inserting ${invoiceRows.length} invoices...`);
    await batchInsert(
      client,
      'invoices',
      [
        'id', 'tenant_id', 'subscription_id', 'provider', 'provider_invoice_id',
        'amount', 'subtotal', 'tax_amount', 'total', 'currency', 'status', 'paid_at',
        'invoice_number', 'created_at', 'updated_at',
      ],
      invoiceRows
    );

    console.log(`Inserting ${activityRows.length} activity_logs...`);
    await batchInsert(
      client,
      'activity_logs',
      ['id', 'tenant_id', 'user_id', 'action', 'details', 'ip_address', 'created_at'],
      activityRows
    );

    await client.query('COMMIT');

    console.log('\n=== SEEDING COMPLETE ===');
    console.log('Total Demo Users:', stats.totalUsers);
    console.log('Plan Distribution:', stats.byPlan);
    console.log('Subscription Status Distribution:', stats.byStatus);
    console.log('Billing Cycle Distribution:', stats.byBilling);
    console.log('Invoices by Status:', stats.invoicesByStatus);
    console.log('Gross Collected Revenue (INR):', stats.collectedRevenueINR.toFixed(2));
    console.log('Refunded Volume (INR):', stats.refundedINR.toFixed(2));
    console.log('Net Collected Revenue (INR):', (stats.collectedRevenueINR - stats.refundedINR).toFixed(2));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed, rolled back:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
