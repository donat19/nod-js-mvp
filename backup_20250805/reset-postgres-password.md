# Reset PostgreSQL Password Guide

Since you've forgotten the PostgreSQL password, here are the steps to reset it:

## Method 1: Using Windows Services (Requires Admin)

1. **Open Command Prompt as Administrator**
   - Press `Win + X` and select "Command Prompt (Admin)" or "PowerShell (Admin)"

2. **Stop PostgreSQL Service**
   ```cmd
   net stop postgresql-x64-17
   ```

3. **Find PostgreSQL Configuration File**
   - Navigate to: `C:\Program Files\PostgreSQL\17\data\`
   - Backup `pg_hba.conf`: copy it to `pg_hba.conf.backup`

4. **Edit pg_hba.conf**
   - Open `pg_hba.conf` in a text editor
   - Find lines like: `host all all 127.0.0.1/32 md5`
   - Change `md5` to `trust` (temporarily removes password requirement)
   - Save the file

5. **Start PostgreSQL Service**
   ```cmd
   net start postgresql-x64-17
   ```

6. **Connect and Change Password**
   ```cmd
   "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -U postgres
   ```
   
   Then run these SQL commands:
   ```sql
   ALTER USER postgres PASSWORD 'postgres';
   CREATE DATABASE automax_db;
   \q
   ```

7. **Restore Security**
   - Stop PostgreSQL service again
   - Restore `pg_hba.conf` from backup (change `trust` back to `md5`)
   - Start PostgreSQL service

## Method 2: Using pgAdmin (If Available)

1. Open pgAdmin (usually in Start Menu under PostgreSQL)
2. If it asks for a password, try common defaults: `postgres`, `admin`, or empty
3. Once connected, right-click on PostgreSQL server → Properties → Connection
4. Change the password there

## Method 3: Reinstall PostgreSQL (Last Resort)

If other methods don't work:
1. Uninstall PostgreSQL from Control Panel
2. Delete remaining files in `C:\Program Files\PostgreSQL\`
3. Download and reinstall PostgreSQL from https://www.postgresql.org/download/windows/
4. During installation, set password to: `postgres`

## After Resetting Password

Update your `.env` file with the correct password and run:
```bash
npm run setup-db
```

This will create the database and run all migrations.
