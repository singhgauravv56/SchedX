# 🚀 MySQL Installation Guide for Smart Timetable Generator

**Your problem:** MySQL is not installed, so the application cannot run.

**Solution:** Install MySQL (easiest option provided below)

---

## 🎯 Option 1: XAMPP (EASIEST - Recommended ⭐)

XAMPP is an all-in-one package that includes MySQL, Apache, PHP, and other tools. Perfect for beginners.

### Step 1: Download XAMPP
1. Go to: https://www.apachefriends.org/
2. Click: "Download" button
3. Select: Windows version (latest)
4. Choose: "XAMPP Windows 7.4.33 / PHP 8.3.0" (or latest version shown)
5. Click the green download button

### Step 2: Install XAMPP
1. Double-click the downloaded `.exe` file
2. Click: "Allow" (if Windows asks for permission)
3. Click: "Next" on all screens (default settings are fine)
4. When asked: "Do you want to continue?", click "Yes"
5. Wait for installation to complete
6. Click: "Finish"

### Step 3: Start MySQL (First Time)
1. Find and open: **XAMPP Control Panel**
   - (Windows Start → type "XAMPP" → click "XAMPP Control Panel")
2. In the panel, find row labeled: **"MySQL"**
3. Click: **"Start"** button (next to MySQL)
4. Wait 2-3 seconds
5. You should see status change to "Running" with green highlight

### Step 4: Verify MySQL is Running
Open Command Prompt and type:
```bash
mysql --version
```

Should show something like:
```
mysql  Ver 8.0.23 for Win64 on x86_64
```

### Step 5: Test Your App
```bash
cd C:\Users\acer\Downloads\SIH25091_Smart_Timetable_WORKING
npm start
```

Should show:
```
✓ Database schema initialized successfully
✓ Smart Timetable Generator running at http://localhost:3000
```

Then open: http://localhost:3000

---

## 🎯 Option 2: MySQL Community Server (For Advanced Users)

If you prefer just MySQL without the extra software:

1. Download: https://www.mysql.com/downloads/mysql/
2. Select: "MySQL Community Server" → Latest version
3. Download: "Windows (x86, 64-bit), MSI Installer"
4. Run the installer (.msi file)
5. Follow setup wizard:
   - Click "Next"
   - Select: "Development Default"
   - Click "Next"
   - Port: 3306 (default)
   - Click "Next"
   - Windows Service: Check "Configure MySQL Server as a Windows Service"
   - Click "Next"
   - MySQL Root Password: Leave blank or set a password
   - Click "Next"
   - Click "Execute"
   - Wait for setup to complete
   - Click "Finish"

6. MySQL will auto-start. Verify by opening Services:
   - Windows Start → type "services.msc"
   - Look for "MySQL80" or similar
   - Should say "Running"

---

## 🔄 After Installation: Keep MySQL Running

### Option A: Manual (Every Time)
Every time you want to use your app:
1. Open XAMPP Control Panel (or Services.msc)
2. Start MySQL
3. Your app will work
4. When done, you can stop it

### Option B: Auto-Start (One-Time Setup)
Make MySQL start automatically when Windows boots:

**For XAMPP:**
1. Right-click XAMPP Control Panel
2. Select "Run as Administrator"
3. Check the box next to "MySQL"
4. Click "Install as Service"
5. Now MySQL starts automatically!

**For MySQL Community Server:**
1. Windows Start → type "services.msc"
2. Find "MySQL80" (or your version)
3. Right-click → Properties
4. Startup Type: Select "Automatic"
5. Click "Apply" → "OK"
6. Now MySQL starts automatically!

---

## 🧪 Verify Everything Works

After installing MySQL, run:

```bash
cd C:\Users\acer\Downloads\SIH25091_Smart_Timetable_WORKING
node diagnose.js
```

You should see:
```
✅ ALL TESTS PASSED! Your database is ready.
🚀 You can now run: npm start
```

If you see any errors, let me know the error message.

---

## 🚀 Finally: Run Your App!

```bash
npm start
```

Expected output:
```
🔧 Initializing database...
   Host: localhost
   User: root
   Database: smartschedule

⏳ Connecting to MySQL server...
✓ Connected to MySQL server
✓ Database created/verified
✓ Connected to database
✓ Schema file loaded
⏳ Executing 9 SQL statements...
✓ Executed 9/9 SQL statements
✓ Database schema initialized successfully

✓ Smart Timetable Generator running at http://localhost:3000
✓ MySQL Database: smartschedule
✓ API Base: http://localhost:3000/api
```

Then open browser: **http://localhost:3000**

---

## 📋 Quick Checklist

- [ ] Downloaded and installed XAMPP (or MySQL Server)
- [ ] Started MySQL service (XAMPP Control Panel or Services)
- [ ] Ran `node diagnose.js` successfully
- [ ] Ran `npm start` successfully
- [ ] Opened http://localhost:3000 and saw the form
- [ ] Entered test data and generated timetable

---

## 💡 Troubleshooting

### "XAMPP installation failed"
- Make sure you have admin rights
- Disable antivirus temporarily during install
- Try downloading again

### "MySQL starts but immediately stops"
- Right-click XAMPP Control Panel → "Run as Administrator"
- Try again

### "npm start still fails after MySQL is running"
- Run diagnostic again: `node diagnose.js`
- Check for error messages
- Verify .env file has correct credentials

### "Can't download XAMPP/MySQL"
- Check internet connection
- Try different browser
- Try downloading at different time

---

## ✅ You're Almost There!

Installation usually takes 10-15 minutes. Once MySQL is installed and running, your app will work perfectly!

If you have any issues:
1. Run the diagnostic: `node diagnose.js`
2. Check the error message
3. Let me know what it says

**Good luck! 🎓**

