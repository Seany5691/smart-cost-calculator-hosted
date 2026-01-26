# 🚀 User Role Fix - Docker Alternative (No psql)

## Problem: psql not found in Docker container

Your Docker container doesn't have `psql` installed. Here are alternative methods:

---

## ✅ METHOD 1: Use Docker Exec with Node.js Script

Since your container has Node.js, we can use a Node.js script to run the SQL:

### Step 1: Create a simple fix script
```bash
cat > /app/scripts/fix-scales-docker.js << 'EOF'
const { Pool } = require('pg');

async function fixScales() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Checking current scales data...');
    
    const checkResult = await pool.query(`
      SELECT id, scales_data->'additional_costs' as additional_costs
      FROM scales 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    console.log('Current data:', JSON.stringify(checkResult.rows[0], null, 2));
    
    console.log('\n📝 Updating scales data...');
    
    const updateResult = await pool.query(`
      UPDATE scales 
      SET scales_data = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              scales_data,
              '{additional_costs,manager_cost_per_kilometer}',
              COALESCE(
                scales_data->'additional_costs'->'manager_cost_per_kilometer',
                scales_data->'additional_costs'->'cost_per_kilometer',
                '0'::jsonb
              )
            ),
            '{additional_costs,manager_cost_per_point}',
            COALESCE(
              scales_data->'additional_costs'->'manager_cost_per_point',
              scales_data->'additional_costs'->'cost_per_point',
              '0'::jsonb
            )
          ),
          '{additional_costs,user_cost_per_kilometer}',
          COALESCE(
            scales_data->'additional_costs'->'user_cost_per_kilometer',
            scales_data->'additional_costs'->'cost_per_kilometer',
            '0'::jsonb
          )
        ),
        '{additional_costs,user_cost_per_point}',
        COALESCE(
          scales_data->'additional_costs'->'user_cost_per_point',
          scales_data->'additional_costs'->'cost_per_point',
          '0'::jsonb
        )
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM scales ORDER BY created_at DESC LIMIT 1)
      RETURNING id
    `);
    
    console.log('✅ Updated:', updateResult.rowCount, 'row(s)');
    
    console.log('\n🔍 Verifying update...');
    
    const verifyResult = await pool.query(`
      SELECT id, scales_data->'additional_costs' as additional_costs
      FROM scales 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    console.log('Updated data:', JSON.stringify(verifyResult.rows[0], null, 2));
    console.log('\n✅ Fix complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixScales();
EOF
```

### Step 2: Run the script
```bash
node /app/scripts/fix-scales-docker.js
```

---

## ✅ METHOD 2: Use Docker Compose Exec

If you're using docker-compose and have a postgres service:

```bash
# From your host machine (not inside the container)
docker-compose exec postgres psql -U your_db_user -d your_db_name -c "
UPDATE scales 
SET scales_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        scales_data,
        '{additional_costs,manager_cost_per_kilometer}',
        COALESCE(
          scales_data->'additional_costs'->'manager_cost_per_kilometer',
          scales_data->'additional_costs'->'cost_per_kilometer',
          '0'::jsonb
        )
      ),
      '{additional_costs,manager_cost_per_point}',
      COALESCE(
        scales_data->'additional_costs'->'manager_cost_per_point',
        scales_data->'additional_costs'->'cost_per_point',
        '0'::jsonb
      )
    ),
    '{additional_costs,user_cost_per_kilometer}',
    COALESCE(
      scales_data->'additional_costs'->'user_cost_per_kilometer',
      scales_data->'additional_costs'->'cost_per_kilometer',
      '0'::jsonb
    )
  ),
  '{additional_costs,user_cost_per_point}',
  COALESCE(
    scales_data->'additional_costs'->'user_cost_per_point',
    scales_data->'additional_costs'->'cost_per_point',
    '0'::jsonb
  )
),
updated_at = CURRENT_TIMESTAMP
WHERE id = (SELECT id FROM scales ORDER BY created_at DESC LIMIT 1);
"
```

---

## ✅ METHOD 3: Use External Database Client

Connect to your database from your local machine or another server that has `psql`:

```bash
# Replace with your actual DATABASE_URL
psql "postgresql://user:password@your-vps-ip:5432/database" -f scripts/fix-user-role-scales.sql
```

---

## ✅ METHOD 4: Use Database GUI Tool

Use a tool like:
- **pgAdmin** (https://www.pgadmin.org/)
- **DBeaver** (https://dbeaver.io/)
- **TablePlus** (https://tableplus.com/)

Connect to your database and run this SQL:

```sql
UPDATE scales 
SET scales_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        scales_data,
        '{additional_costs,manager_cost_per_kilometer}',
        COALESCE(
          scales_data->'additional_costs'->'manager_cost_per_kilometer',
          scales_data->'additional_costs'->'cost_per_kilometer',
          '0'::jsonb
        )
      ),
      '{additional_costs,manager_cost_per_point}',
      COALESCE(
        scales_data->'additional_costs'->'manager_cost_per_point',
        scales_data->'additional_costs'->'cost_per_point',
        '0'::jsonb
      )
    ),
    '{additional_costs,user_cost_per_kilometer}',
    COALESCE(
      scales_data->'additional_costs'->'user_cost_per_kilometer',
      scales_data->'additional_costs'->'cost_per_kilometer',
      '0'::jsonb
    )
  ),
  '{additional_costs,user_cost_per_point}',
  COALESCE(
    scales_data->'additional_costs'->'user_cost_per_point',
    scales_data->'additional_costs'->'cost_per_point',
    '0'::jsonb
  )
),
updated_at = CURRENT_TIMESTAMP
WHERE id = (SELECT id FROM scales ORDER BY created_at DESC LIMIT 1);
```

---

## 🔍 After Running the Fix

### Verify it worked:
```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT scales_data->\'additional_costs\' FROM scales ORDER BY created_at DESC LIMIT 1')
  .then(r => { console.log(JSON.stringify(r.rows[0], null, 2)); pool.end(); })
  .catch(e => { console.error(e); pool.end(); });
"
```

### Restart your app:
```bash
# If using PM2
pm2 restart all

# If using Docker
exit  # Exit the container
docker-compose restart  # From host machine
```

---

## 📝 RECOMMENDED: Use Method 1

Method 1 is the easiest since your container already has Node.js and the `pg` package installed.

Just copy-paste the commands from Method 1!
