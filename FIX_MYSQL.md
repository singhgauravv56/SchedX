# 🔧 MySQL Not Running - SOLUTIONS

## ❌ Problem
MySQL server is not running on your computer. This is why the application cannot connect to the database.

---

## ✅ SOLUTION 1: Start MySQL Using Windows Services

### Step-by-step:

1. **Open Services Manager**
   - Press: `Windows Key + R`
   - Type: `services.msc`
   - Press: `Enter`

2. **Find MySQL Service**
   - Look for "MySQL80" or "MySQL57" or "MySQL" in the list
   - (The version number might be different)

3. **Start the Service**
   - Right-click on MySQL service
   - Select: "Start"
   - Wait for status to change to "Running"

4. **Run Your App**
   ```bash
   npm start
   ```

---

## ✅ SOLUTION 2: Start MySQL Using Command Line

### Option A (Windows Command Prompt as Administrator):
```bash
net start MySQL80
```
(Replace 80 with your MySQL version if different)

### Option B (PowerShell as Administrator):
```powershell
Start-Service -Name MySQL80
```

---

## ✅ SOLUTION 3: Open MySQL Command Line Client

If you installed MySQL, you should have "MySQL Command Line Client" installed:

1. **Search for MySQL Client**
   - Press: `Windows Key`
   - Type: "MySQL"
   - Click: "MySQL 8.0 Command Line Client"

2. **Login**
   - It will ask for password
   - Press Enter (default is empty password)
   - You'll see: `mysql>`

3. **Verify It Works**
   ```sql
   SHOW DATABASES;
   EXIT;
   ```

4. **The MySQL service should now be running**

---

## ✅ SOLUTION 4: Download MySQL If You Don't Have It

If you don't have MySQL installed:

### Download Option 1 (MySQL Only):
- Go to: https://www.mysql.com/downloads/mysql/
- Download: MySQL Community Server (latest version)
- Install it
- Run installer and follow setup wizard

### Download Option 2 (MySQL + Tools - Easiest):
- Go to: https://www.apachefriends.org/
- Download: XAMPP (includes MySQL, Apache, PHP)
- Install it
- Open XAMPP Control Panel
- Click "Start" next to MySQL
- Much easier!

---

## 🔍 How to Check If MySQL is Running

### Using PowerShell:
```powershell
Get-Service | Where-Object {$_.Name -match "MySQL"}
```

Should show: `Status : Running`

### Using Command Prompt:
```bash
tasklist | find /i "mysql"
```

Should show MySQL process running

---

## 🚀 After Starting MySQL, Then Run:

```bash
cd C:\Users\acer\Downloads\SIH25091_Smart_Timetable_WORKING
npm start
```

You should see:
```
✓ Database schema initialized successfully
✓ Smart Timetable Generator running at http://localhost:3000
✓ MySQL Database: smartschedule
✓ API Base: http://localhost:3000/api
```

Then open: http://localhost:3000

---

## ⚠️ Common Issues

### "Access denied for user 'root'@'localhost'"
- MySQL is running but password is wrong
- Edit `.env` and check DB_PASSWORD
- If you set a password during MySQL install, use that password

### "Can't connect to MySQL server on 'localhost'"
- MySQL is NOT running (this is your current issue)
- Use one of the solutions above to start it

### "Unknown database 'smartschedule'"
- This is normal on first run
- The app will create it automatically
- Just make sure MySQL is running

---

## 📝 Quick Checklist

- [ ] MySQL installed on computer
- [ ] MySQL service started (see Solutions 1-3 above)
- [ ] Verified MySQL is running (tasklist command)
- [ ] Ran: `node diagnose.js` (should show ✅ all tests)
- [ ] Ran: `npm start` (should show server running)
- [ ] Opened: http://localhost:3000 (should load page)

---

## 💡 Pro Tip

**Keep MySQL running while developing:**

After starting MySQL once, you can keep it running in the background. You don't need to restart it every time you restart your app.

Some people add MySQL to Windows startup so it runs automatically.

---

## Still Having Issues?

1. Run the diagnostic again:
   ```bash
   node diagnose.js
   ```

2. Check if there are error messages (copy-paste them)

3. Verify MySQL is actually running:
   - Open Services Manager
   - Search for "MySQL"
   - Check "Status" column says "Running"

4. Try XAMPP if you want an all-in-one solution

---

**Once MySQL is running, everything else will work perfectly!** 🎓

