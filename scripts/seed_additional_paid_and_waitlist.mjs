#!/usr/bin/env node
/**
 * Seeder: +152 Paid-Plan Indian Users + 432 Waitlist (Pending Approval) Indian Users
 *
 * Idempotent: cleans up any previous rows tagged with `batch = 'batch_152_paid_432_waitlist'`
 * and ensures zero name/email/UUID collisions with existing users.
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

function createRng(seed = 2026112702) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(2026112702);
const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

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
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Chandigarh', state: 'Chandigarh' },
  { city: 'Gurugram', state: 'Haryana' },
  { city: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Indore', state: 'Madhya Pradesh' },
  { city: 'Surat', state: 'Gujarat' },
  { city: 'Kochi', state: 'Kerala' },
  { city: 'Coimbatore', state: 'Tamil Nadu' },
  { city: 'Nagpur', state: 'Maharashtra' },
];

const PROFESSIONS = [
  { designation: 'Founder & CEO', department: 'Executive', suffix: 'Technologies Pvt Ltd' },
  { designation: 'Business Owner', department: 'Management', suffix: 'Enterprises' },
  { designation: 'Growth Marketing Lead', department: 'Marketing', suffix: 'Digital Media' },
  { designation: 'Agency Director', department: 'Client Services', suffix: 'Creative Agency' },
  { designation: 'Senior Software Engineer', department: 'Engineering', suffix: 'Systems Pvt Ltd' },
  { designation: 'Management Consultant', department: 'Advisory', suffix: 'Advisory Partners' },
  { designation: 'E-commerce Manager', department: 'E-commerce', suffix: 'Retail Pvt Ltd' },
  { designation: 'VP of Operations', department: 'Operations', suffix: 'InfraTech Ltd' },
];

const COMPANY_PREFIXES = [
  'Bharat', 'Indus', 'Nava', 'Kaveri', 'Veda', 'Surya', 'Deccan', 'Zenith', 'Pragati', 'Nirman',
  'Shakti', 'Aarohan', 'Sankalp', 'Lakshya', 'Tarang', 'Uday', 'Tejas', 'Kiran', 'Vikas', 'Samridhi',
  'Apex', 'Nova', 'Pulse', 'Vertex', 'Cloud', 'Pixel', 'Metric', 'Scale', 'Bridge', 'Spark'
];

const PROVIDERS = ['razorpay', 'razorpay', 'cashfree', 'phonepe', 'stripe'];

const PAID_PLAN_TARGETS = [
  { planId: 'starter', count: 68 },
  { planId: 'professional', count: 56 },
  { planId: 'enterprise', count: 28 },
]; // Sum = 152

const WAITLIST_COUNT = 432;

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
    const plansRes = await client.query(
      'SELECT id, name, tier, price, billing, currency, trial_days, token_limit, agent_limit, storage_limit_gb, image_limit_monthly FROM plans'
    );
    const planMap = {};
    for (const p of plansRes.rows) {
      planMap[p.id] = { ...p, price: parseFloat(p.price) };
    }

    await client.query('BEGIN');

    // 1. Clean up any previous run of this batch
    const oldBatchRes = await client.query(
      `SELECT DISTINCT tenant_id FROM users WHERE settings->>'batch' = 'batch_152_paid_432_waitlist'`
    );
    if (oldBatchRes.rows.length > 0) {
      const oldTenantIds = oldBatchRes.rows.map((r) => r.tenant_id);
      await client.query(`DELETE FROM activity_logs WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM invoices WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM subscriptions WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM users WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [oldTenantIds]);
    }

    // 2. Ensure existing demo_indian_dataset users are active so total pending waitlist = exactly 432
    await client.query(
      `UPDATE users SET status = 'active' WHERE settings->>'source' = 'demo_indian_dataset' AND status = 'pending'`
    );

    // 3. Load existing names and emails to guarantee zero collisions
    const existingRes = await client.query('SELECT name, email FROM users');
    const usedNames = new Set(existingRes.rows.map((r) => (r.name || '').toLowerCase()));
    const usedEmails = new Set(existingRes.rows.map((r) => (r.email || '').toLowerCase()));

    // Build remaining unique name pool
    const availableNames = [];
    for (const fn of FIRST_NAMES) {
      for (const ln of LAST_NAMES) {
        const fullName = `${fn} ${ln}`;
        if (!usedNames.has(fullName.toLowerCase())) {
          availableNames.push({ firstName: fn, lastName: ln, fullName });
        }
      }
    }
    for (let i = availableNames.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [availableNames[i], availableNames[j]] = [availableNames[j], availableNames[i]];
    }

    const neededTotal = 152 + WAITLIST_COUNT; // 584
    if (availableNames.length < neededTotal) {
      throw new Error(`Not enough unique names available (${availableNames.length} < ${neededTotal})`);
    }

    const now = new Date();
    const demoPasswordHash = '$2b$10$DemoSyntheticIndianUserHash000000000000000000000000000';

    const tenantRows = [];
    const userRows = [];
    const subRows = [];
    const invoiceRows = [];
    const activityRows = [];

    let invoiceSeq = 50001;
    let nameIdx = 0;

    // 4. Generate 152 Paid-Plan Users (NO free plan)
    const paidPlanPool = [];
    for (const target of PAID_PLAN_TARGETS) {
      for (let i = 0; i < target.count; i++) paidPlanPool.push(target.planId);
    }
    for (let i = paidPlanPool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [paidPlanPool[i], paidPlanPool[j]] = [paidPlanPool[j], paidPlanPool[i]];
    }

    for (let i = 0; i < 152; i++) {
      const person = availableNames[nameIdx++];
      const planId = paidPlanPool[i];
      const plan = planMap[planId];
      const loc = pick(CITIES);
      const prof = pick(PROFESSIONS);
      const companyName = `${pick(COMPANY_PREFIXES)} ${prof.suffix}`;
      const tenantId = crypto.randomUUID();
      const userId = crypto.randomUUID();

      let seq = 2001 + i;
      let email = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}.${seq}@example.test`;
      while (usedEmails.has(email)) {
        seq++;
        email = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}.${seq}@example.test`;
      }
      usedEmails.add(email);

      const slugBase = `${person.firstName.toLowerCase()}-${person.lastName.toLowerCase()}-p${seq}`;
      const username = `${person.firstName.toLowerCase()}_${person.lastName.toLowerCase()}_p${seq}`;
      const phone = `+91-9${String(100000000 + randInt(0, 899999999)).padStart(9, '0')}`;
      const initials = `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();

      const daysAgo = randInt(5, 300);
      const registeredAt = new Date(now.getTime() - daysAgo * 86400000);
      const lastLoginAt = new Date(now.getTime() - randInt(0, Math.min(daysAgo, 15)) * 86400000);

      const billingCycle = rng() < 0.3 ? 'annual' : 'monthly';
      const subAmount = billingCycle === 'annual' ? plan.price * 10 : plan.price;
      const periodDays = billingCycle === 'annual' ? 365 : 30;

      const subId = crypto.randomUUID();
      const provider = pick(PROVIDERS);

      let currentPeriodStart = new Date(registeredAt.getTime());
      let currentPeriodEnd = new Date(currentPeriodStart.getTime() + periodDays * 86400000);
      let renewalCount = 0;
      while (currentPeriodEnd < now) {
        renewalCount++;
        currentPeriodStart = new Date(currentPeriodEnd.getTime());
        currentPeriodEnd = new Date(currentPeriodStart.getTime() + periodDays * 86400000);
      }

      tenantRows.push([tenantId, `${companyName} (${loc.city})`, slugBase, planId, 'active', registeredAt, now]);
      userRows.push([
        userId, tenantId, email, demoPasswordHash, 'owner', 'active', true,
        person.fullName, username, phone, companyName, prof.designation, prof.department, 'IN',
        `${prof.designation} based in ${loc.city}, ${loc.state}.`,
        JSON.stringify({
          source: 'demo_indian_dataset',
          batch: 'batch_152_paid_432_waitlist',
          city: loc.city,
          state: loc.state,
          initials,
          last_login_at: lastLoginAt.toISOString(),
          usage_stats: {
            conversations_count: randInt(8, 120),
            messages_count: randInt(30, 800),
            tokens_used: randInt(1500, plan.token_limit > 0 ? plan.token_limit : 200000),
          },
        }),
        JSON.stringify({ city: loc.city, state: loc.state, country: 'IN', plan_id: planId, billing_cycle: billingCycle }),
        registeredAt, lastLoginAt,
      ]);

      subRows.push([
        subId, tenantId, provider, `sub_demo_${slugBase}`, planId, 'active',
        currentPeriodStart, currentPeriodEnd, subAmount, 'INR',
        JSON.stringify({
          source: 'demo_indian_dataset',
          batch: 'batch_152_paid_432_waitlist',
          billing_cycle: billingCycle,
          renewal_count: renewalCount,
        }),
        registeredAt, now,
      ]);

      const numCycles = billingCycle === 'annual' ? 1 : Math.min(12, Math.max(1, Math.floor(daysAgo / 30) + 1));
      for (let c = 0; c < numCycles; c++) {
        const cycleDate = new Date(registeredAt.getTime() + c * periodDays * 86400000);
        if (cycleDate > now) break;
        const subtotalAmt = Math.round((subAmount / 1.18) * 100) / 100;
        const taxAmt = Math.round((subAmount - subtotalAmt) * 100) / 100;
        invoiceRows.push([
          crypto.randomUUID(), tenantId, subId, provider, `pay_in_${crypto.randomBytes(6).toString('hex')}`,
          subAmount, subtotalAmt, taxAmt, subAmount, 'INR', 'paid', cycleDate,
          `INV-IN-${String(invoiceSeq++).padStart(6, '0')}`, cycleDate, cycleDate,
        ]);
      }

      activityRows.push([
        crypto.randomUUID(), tenantId, userId, 'user_registered',
        JSON.stringify({ city: loc.city, state: loc.state, plan: planId, batch: 'batch_152_paid_432_waitlist' }),
        `103.${randInt(10, 240)}.${randInt(1, 254)}.${randInt(1, 254)}`, registeredAt,
      ]);
      activityRows.push([
        crypto.randomUUID(), tenantId, userId, 'subscription_active',
        JSON.stringify({ plan_id: planId, billing_cycle: billingCycle, amount: subAmount, currency: 'INR' }),
        `103.${randInt(10, 240)}.${randInt(1, 254)}.${randInt(1, 254)}`, currentPeriodStart,
      ]);
    }

    // 5. Generate 432 Waitlist Users (status = 'pending')
    const requestedPlans = ['starter', 'starter', 'professional', 'professional', 'enterprise'];
    for (let i = 0; i < WAITLIST_COUNT; i++) {
      const person = availableNames[nameIdx++];
      const loc = pick(CITIES);
      const prof = pick(PROFESSIONS);
      const companyName = `${pick(COMPANY_PREFIXES)} ${prof.suffix}`;
      const requestedPlan = pick(requestedPlans);
      const tenantId = crypto.randomUUID();
      const userId = crypto.randomUUID();

      let seq = 3001 + i;
      let email = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}.w${seq}@example.test`;
      while (usedEmails.has(email)) {
        seq++;
        email = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}.w${seq}@example.test`;
      }
      usedEmails.add(email);

      const slugBase = `${person.firstName.toLowerCase()}-${person.lastName.toLowerCase()}-w${seq}`;
      const username = `${person.firstName.toLowerCase()}_${person.lastName.toLowerCase()}_w${seq}`;
      const phone = `+91-9${String(100000000 + randInt(0, 899999999)).padStart(9, '0')}`;
      const initials = `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();

      const daysAgo = randInt(1, 45);
      const registeredAt = new Date(now.getTime() - daysAgo * 86400000);

      tenantRows.push([tenantId, `${companyName} (${loc.city})`, slugBase, 'free', 'active', registeredAt, now]);
      userRows.push([
        userId, tenantId, email, demoPasswordHash, 'owner', 'pending', false,
        person.fullName, username, phone, companyName, prof.designation, prof.department, 'IN',
        `Waitlist signup (${prof.designation}) in ${loc.city}, ${loc.state}.`,
        JSON.stringify({
          source: 'request_access',
          waitlist: true,
          batch: 'batch_152_paid_432_waitlist',
          requested_plan: requestedPlan,
          city: loc.city,
          state: loc.state,
          initials,
          usage_stats: { conversations_count: 0, messages_count: 0, tokens_used: 0 },
        }),
        JSON.stringify({ city: loc.city, state: loc.state, country: 'IN', requested_plan: requestedPlan }),
        registeredAt, registeredAt,
      ]);

      activityRows.push([
        crypto.randomUUID(), tenantId, userId, 'waitlist_joined',
        JSON.stringify({ city: loc.city, state: loc.state, requested_plan: requestedPlan }),
        `103.${randInt(10, 240)}.${randInt(1, 254)}.${randInt(1, 254)}`, registeredAt,
      ]);
    }

    await batchInsert(client, 'tenants', ['id', 'name', 'slug', 'plan', 'status', 'created_at', 'updated_at'], tenantRows);
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
    await batchInsert(
      client,
      'activity_logs',
      ['id', 'tenant_id', 'user_id', 'action', 'details', 'ip_address', 'created_at'],
      activityRows
    );

    await client.query('COMMIT');
    console.log('=== ADDITIONAL SEEDING COMPLETE ===');
    console.log('Added Paid Users:', 152, '(starter: 68, professional: 56, enterprise: 28)');
    console.log('Added Waitlist (pending) Users:', WAITLIST_COUNT);
    console.log('Added Subscriptions:', subRows.length);
    console.log('Added Paid Invoices:', invoiceRows.length);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Additional seeding failed, rolled back:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
