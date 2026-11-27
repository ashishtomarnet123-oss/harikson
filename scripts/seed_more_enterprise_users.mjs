#!/usr/bin/env node
/**
 * Seeder: +120 Additional Enterprise Tier Indian Customers
 *
 * Idempotent: cleans up any previous rows tagged with `batch = 'batch_enterprise_120'`
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

function createRng(seed = 2026112703) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(2026112703);
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
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Gurugram', state: 'Haryana' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Kolkata', state: 'West Bengal' },
];

const ENTERPRISE_ROLES = [
  { designation: 'Chief Technology Officer', department: 'Engineering', suffix: 'Enterprise Systems Ltd' },
  { designation: 'VP of Engineering', department: 'Platform', suffix: 'CloudTech India Pvt Ltd' },
  { designation: 'Chief Operating Officer', department: 'Operations', suffix: 'Global Logistics Ltd' },
  { designation: 'Head of AI & Data', department: 'Data Science', suffix: 'FinServe Corp' },
  { designation: 'Managing Director', department: 'Executive', suffix: 'Industries Ltd' },
  { designation: 'VP of Product', department: 'Product', suffix: 'Digital Ventures Pvt Ltd' },
];

const COMPANY_PREFIXES = [
  'Bharat', 'Indus', 'Deccan', 'Vanguard', 'Aether', 'Nexus', 'Quantum', 'Horizon', 'Vertex', 'Pinnacle',
  'Sovereign', 'Summit', 'Atlas', 'Zenith', 'Kaveri', 'Surya', 'Meridian', 'Crest', 'Titan', 'Prime'
];

const PROVIDERS = ['razorpay', 'razorpay', 'stripe', 'cashfree'];
const TARGET_COUNT = 120;

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
    const planRes = await client.query(`SELECT * FROM plans WHERE id = 'enterprise' LIMIT 1`);
    if (planRes.rows.length === 0) throw new Error('Enterprise plan not found');
    const plan = { ...planRes.rows[0], price: parseFloat(planRes.rows[0].price) };

    await client.query('BEGIN');

    // Clean up previous run of this batch if re-run
    const oldBatchRes = await client.query(
      `SELECT DISTINCT tenant_id FROM users WHERE settings->>'batch' = 'batch_enterprise_120'`
    );
    if (oldBatchRes.rows.length > 0) {
      const oldTenantIds = oldBatchRes.rows.map((r) => r.tenant_id);
      await client.query(`DELETE FROM activity_logs WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM invoices WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM subscriptions WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM users WHERE tenant_id = ANY($1::uuid[])`, [oldTenantIds]);
      await client.query(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [oldTenantIds]);
    }

    const existingRes = await client.query('SELECT name, email FROM users');
    const usedNames = new Set(existingRes.rows.map((r) => (r.name || '').toLowerCase()));
    const usedEmails = new Set(existingRes.rows.map((r) => (r.email || '').toLowerCase()));

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

    if (availableNames.length < TARGET_COUNT) {
      throw new Error(`Not enough unique names (${availableNames.length} < ${TARGET_COUNT})`);
    }

    const now = new Date();
    const demoPasswordHash = '$2b$10$DemoSyntheticIndianUserHash000000000000000000000000000';

    const tenantRows = [];
    const userRows = [];
    const subRows = [];
    const invoiceRows = [];
    const activityRows = [];

    let invoiceSeq = 70001;

    for (let i = 0; i < TARGET_COUNT; i++) {
      const person = availableNames[i];
      const loc = pick(CITIES);
      const roleInfo = pick(ENTERPRISE_ROLES);
      const companyName = `${pick(COMPANY_PREFIXES)} ${roleInfo.suffix}`;
      const tenantId = crypto.randomUUID();
      const userId = crypto.randomUUID();

      let seq = 5001 + i;
      let email = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}.ent${seq}@example.test`;
      while (usedEmails.has(email)) {
        seq++;
        email = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}.ent${seq}@example.test`;
      }
      usedEmails.add(email);

      const slugBase = `${person.firstName.toLowerCase()}-${person.lastName.toLowerCase()}-ent${seq}`;
      const username = `${person.firstName.toLowerCase()}_${person.lastName.toLowerCase()}_ent${seq}`;
      const phone = `+91-9${String(100000000 + randInt(0, 899999999)).padStart(9, '0')}`;
      const initials = `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();

      const daysAgo = randInt(10, 320);
      const registeredAt = new Date(now.getTime() - daysAgo * 86400000);
      const lastLoginAt = new Date(now.getTime() - randInt(0, Math.min(daysAgo, 10)) * 86400000);

      const billingCycle = rng() < 0.45 ? 'annual' : 'monthly';
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

      tenantRows.push([tenantId, `${companyName} (${loc.city})`, slugBase, 'enterprise', 'active', registeredAt, now]);
      userRows.push([
        userId, tenantId, email, demoPasswordHash, 'owner', 'active', true,
        person.fullName, username, phone, companyName, roleInfo.designation, roleInfo.department, 'IN',
        `${roleInfo.designation} at ${companyName} (${loc.city}, ${loc.state}).`,
        JSON.stringify({
          source: 'demo_indian_dataset',
          batch: 'batch_enterprise_120',
          city: loc.city,
          state: loc.state,
          initials,
          last_login_at: lastLoginAt.toISOString(),
          usage_stats: {
            conversations_count: randInt(40, 320),
            messages_count: randInt(250, 2400),
            tokens_used: randInt(50000, 450000),
          },
        }),
        JSON.stringify({ city: loc.city, state: loc.state, country: 'IN', plan_id: 'enterprise', billing_cycle: billingCycle }),
        registeredAt, lastLoginAt,
      ]);

      subRows.push([
        subId, tenantId, provider, `sub_demo_${slugBase}`, 'enterprise', 'active',
        currentPeriodStart, currentPeriodEnd, subAmount, 'INR',
        JSON.stringify({
          source: 'demo_indian_dataset',
          batch: 'batch_enterprise_120',
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
          `INV-ENT-${String(invoiceSeq++).padStart(6, '0')}`, cycleDate, cycleDate,
        ]);
      }

      activityRows.push([
        crypto.randomUUID(), tenantId, userId, 'user_registered',
        JSON.stringify({ city: loc.city, state: loc.state, plan: 'enterprise', batch: 'batch_enterprise_120' }),
        `103.${randInt(10, 240)}.${randInt(1, 254)}.${randInt(1, 254)}`, registeredAt,
      ]);
      activityRows.push([
        crypto.randomUUID(), tenantId, userId, 'subscription_active',
        JSON.stringify({ plan_id: 'enterprise', billing_cycle: billingCycle, amount: subAmount, currency: 'INR' }),
        `103.${randInt(10, 240)}.${randInt(1, 254)}.${randInt(1, 254)}`, currentPeriodStart,
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
    console.log('=== ENTERPRISE SEEDING COMPLETE ===');
    console.log('Added Enterprise Users:', TARGET_COUNT);
    console.log('Added Subscriptions:', subRows.length);
    console.log('Added Paid Invoices:', invoiceRows.length);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Enterprise seeding failed, rolled back:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
