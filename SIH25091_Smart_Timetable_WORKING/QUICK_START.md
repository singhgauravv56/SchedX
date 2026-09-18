# 🚀 Smart Timetable Generator - Quick Start

## ⚡ 30-Second Setup

```bash
# 1. Navigate to project
cd C:\Users\acer\Downloads\SIH25091_Smart_Timetable_WORKING

# 2. Configure (edit .env if MySQL has password)
# cp .env.example .env

# 3. Install (skip if already done)
npm install

# 4. Start
npm start

# 5. Open browser
# http://localhost:3000
```

---

## 🎯 What to Expect

✅ Empty database (no demo data)  
✅ Single form to fill out  
✅ Automatic time slot generation  
✅ Conflict-free timetable creation  
✅ Data saved to MySQL  
✅ Timetable persists after refresh  

---

## 📝 Sample Test Data

### To Generate Your First Timetable:

**Teacher**
- Name: `Dr. Rahul Kumar`
- Specialization: `Database Systems`

**Department**: `CSE`  
**Course**: `DBMS`  
**Class**: `BCA`, Section: `A`  
**Students**: `40`  
**Room Type**: `Classroom`  
**Working Days**: `5`  
**Hours**: `09:00` to `16:00`

→ Click **Generate Timetable**  
→ Should create 5 scheduled periods  
→ Refresh page → timetable still there ✅

---

## 🔗 API Base URL

```
http://localhost:3000/api
```

### Endpoints to Test:

```
GET  /api/health                    # Check database
POST /api/generate-timetable        # Generate timetable
GET  /api/timetable                 # Get timetable
DELETE /api/timetable               # Clear timetable
```

---

## 📊 Database

Name: `smartschedule`  
Status: **EMPTY** (start fresh each time)  
Tables: 9 (departments, teachers, courses, classes, rooms, time_slots, working_days, teacher_courses, timetable)

---

## 🎨 UI Features

- Single-page form
- Real-time database status
- Success/error messages
- Timetable display table
- Refresh & Clear buttons
- Toast notifications
- Mobile responsive

---

## 🐛 Quick Troubleshoot

| Problem | Solution |
|---------|----------|
| "Server not running" | Run `npm start` |
| "MySQL not reachable" | Start MySQL service |
| "Port 3000 in use" | Edit PORT in .env |
| Form validation error | Fill all required fields (*) |
| "No suitable room" | System creates one automatically |
| Timetable not persisting | Check MySQL connection |

---

## 📚 Documentation

- `README.md` - Full setup guide
- `IMPLEMENTATION.md` - Detailed feature list
- `CHECKLIST.md` - Verification checklist
- `QUICK_START.md` - This file

---

## ✨ Key Files

| File | Purpose |
|------|---------|
| `server.js` | Backend API |
| `public/index.html` | User interface |
| `public/script.js` | Frontend logic |
| `public/style.css` | Styling |
| `database/smartschedule.sql` | Database schema |
| `.env` | Database config |

---

## 🎓 Learning Resources

This project demonstrates:
- ✅ Full-stack web development
- ✅ RESTful API design
- ✅ Database normalization
- ✅ Conflict resolution algorithms
- ✅ Form validation
- ✅ Error handling
- ✅ Responsive UI design
- ✅ Async JavaScript (fetch)
- ✅ MySQL with constraints
- ✅ Node.js/Express.js

---

## 💡 How It Works (High Level)

```
1. User fills form
   ↓
2. Frontend validates
   ↓
3. Sends to API
   ↓
4. Backend creates resources
   ↓
5. Generates time slots (1-hour each)
   ↓
6. Checks 11 conflict conditions
   ↓
7. Assigns slots to timetable
   ↓
8. Saves to MySQL
   ↓
9. Returns result to frontend
   ↓
10. Displays timetable
    ↓
11. Persists in database
```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Server starts without errors
2. ✅ Page loads at http://localhost:3000
3. ✅ Database status shows "Connected"
4. ✅ Form allows you to enter data
5. ✅ Generate button creates timetable
6. ✅ Timetable displays with 5+ entries
7. ✅ Refresh page → timetable still there
8. ✅ No errors in browser console

---

## 🎉 You're Ready!

Everything is set up and ready to use.

**Start with**:
```bash
npm start
```

**Then open**:
```
http://localhost:3000
```

Enjoy your Smart Timetable Generator! 🎓

---

**Version**: 2.0.0  
**Last Updated**: August 31, 2026  
**Status**: ✅ Production Ready
