# SIH25091 SmartSchedule — Working MySQL Version

## Requirements
- Node.js 18+
- MySQL 8+
- VS Code

## Run
1. Start MySQL.
2. Copy `.env.example` to `.env` and enter your MySQL password if you have one.
3. Open terminal in this folder.
4. Run `npm install`.
5. Run `npm start`.
6. Open http://localhost:3000

The server automatically creates the `smartschedule` database and tables and loads starter data. You can also manually run `database/smartschedule.sql` in MySQL Workbench.

## Important
Do not open `index.html` directly. Run the Node server with `npm start`, because the website uses the backend API and MySQL.

## Main flow
Courses + Teachers + Classes + Rooms -> MySQL -> Generate -> conflict checks -> MySQL timetable -> display.
