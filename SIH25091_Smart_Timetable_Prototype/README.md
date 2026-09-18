# SIH25091 SmartSchedule AI — Prototype

## What this is
A front-end prototype for:
"AI-Based Timetable Generation System aligned with NEP 2020 for Multidisciplinary Education Structures."

## Run
No installation is required for this prototype.

1. Open `index.html` in a browser.
2. Or use VS Code + Live Server.
3. Click Dashboard -> Generate Timetable.
4. Explore Courses, Teachers, Rooms, Constraints, Timetable and AI Assistant.

## Important
The current Generate action is a deterministic simulation for demonstrating the product workflow. It is NOT a production AI scheduler.

For a real SIH implementation, replace the simulation with:
- Google OR-Tools / constraint programming, or
- a genetic algorithm / hybrid optimizer,
- a Python FastAPI backend,
- PostgreSQL,
- authentication and role-based access,
- real NEP 2020 academic structure and institutional constraints.

## Suggested production architecture
React -> FastAPI -> PostgreSQL/PostGIS
                   |
                   +-> Optimization Engine
                   +-> Optional LLM/RAG Assistant
