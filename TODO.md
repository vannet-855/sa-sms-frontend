# TODO - EduTrack SMS Admin Dashboard

- [x] Create Angular auth guard that checks `edutrack_token` in localStorage
- [x] Update Angular routing (`app.routes.ts`) to match spec

- [x] Implement Angular login integration (POST /api/auth/login, store JWT, navigate to /dashboard)






- [ ] Implement Angular Dashboard UI: `DashboardComponent`, `SidebarComponent`, `TopbarComponent`, `dashboard.service.ts`, styling
- [x] Implement backend JWT middleware (`middleware/auth.middleware.js`)
- [x] Update backend auth controller to return JWT on login

- [x] Add backend routes: dashboard stats, recent students, attendance today, upcoming exams

- [x] Mount backend routes in `backend/app.js`

- [x] Add backend `.env` with DB + JWT settings
- [x] Add DB schema + seed data in `database/schema.sql`





- [x] Run backend + build frontend to verify no TS/JS errors


