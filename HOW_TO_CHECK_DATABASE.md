# How to Check if Database Was Created

## You're Currently in PostgreSQL Prompt

You see `postgres=#` which means you're inside the PostgreSQL interactive terminal.

---

## Step 1: List All Databases

Type this command and press Enter:

```sql
\l
```

This will show you all databases. Look for `smart_calculator` in the list.

---

## Step 2: If You See `smart_calculator` - Great!

If you see it in the list, the database exists. Now exit PostgreSQL:

```sql
\q
```

Then continue to Step 3 below.

---

## Step 3: If You DON'T See `smart_calculator` - Create It

If it's not in the list, create it now:

```sql
CREATE DATABASE smart_calculator;
```

You should see: `CREATE DATABASE`

Then verify it was created:

```sql
\l
```

Now you should see `smart_calculator` in the list.

Exit PostgreSQL:

```sql
\q
```

---

## Step 4: Run Migrations

After exiting PostgreSQL (you should see your normal command prompt), run:

```bash
docker exec smart-calculator-app npm run migrate
```

This will create all the tables your app needs.

---

## Step 5: Restart the App

```bash
docker restart smart-calculator-app
```

---

## Step 6: Test the App

Wait 10 seconds for the app to start, then test:

```bash
curl http://localhost:3456/api/health
```

Or open in browser:
```
http://YOUR_VPS_IP:3456/login
```

**Login credentials:**
- Username: `Camryn`
- Password: `Elliot6242!`

---

## Quick Reference

**Current situation:** You're in PostgreSQL prompt (`postgres=#`)

**What to do:**
1. Type `\l` and press Enter (lists databases)
2. Look for `smart_calculator`
3. If missing, type `CREATE DATABASE smart_calculator;` and press Enter
4. Type `\q` and press Enter (exits PostgreSQL)
5. Run migrations: `docker exec smart-calculator-app npm run migrate`
6. Restart app: `docker restart smart-calculator-app`
7. Test: `curl http://localhost:3456/api/health`

---

## Understanding PostgreSQL Prompt

- `postgres=#` - You're in PostgreSQL as superuser
- `postgres-#` - PostgreSQL is waiting for you to finish a command (you probably have an unclosed quote or parenthesis)
- Normal prompt - You've exited PostgreSQL

**If you see `postgres-#`:** Press Ctrl+C to cancel the current command, then try again.

---

## Common Issues

### Issue: I see `postgres-#` instead of `postgres=#`

**Solution:** Press `Ctrl+C` to cancel, then try your command again.

### Issue: Command not found after typing `\l`

**Solution:** Make sure you're in the PostgreSQL prompt (you should see `postgres=#`). If not, run:
```bash
docker exec -it smart-cost-calculator-postgres-rnfhko psql -U postgres
```

### Issue: Database already exists error

**Solution:** That's fine! It means the database is already there. Just exit with `\q` and continue to migrations.

---

**Next Step:** Type `\l` and press Enter to see if `smart_calculator` database exists.
