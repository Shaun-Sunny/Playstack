# Employee Management System (EMS)

A full-stack Employee Management System with JWT authentication, role-based access control (Super Admin / HR / Employee), organizational hierarchy, and a searchable/filterable employee dashboard.

**Repo:** https://github.com/Shaun-Sunny/Playstack

---

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (hosted on Supabase), Prisma ORM
- **Auth:** JWT (httpOnly cookie) + bcrypt

---

## Project Structure

```
ems/
├── backend/     # Express API + Prisma schema
├── frontend/    # Next.js app
└── docker-compose.yml
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/Shaun-Sunny/SpearHub.git
cd SpearHub/ems
```

### 2. Backend environment variables

Create `backend/.env`:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/postgres"
JWT_SECRET="<a long random string>"
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

> Note: if your database password contains special characters (`@`, `#`, `%`, etc.), URL-encode them (e.g. `@` → `%40`).

### 3. Frontend environment variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### 4. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 5. Run database migrations and seed

```bash
cd backend
npx prisma migrate dev --name init
npm run seed
```

This creates a default **Super Admin** account:

| Field | Value |
|---|---|
| Email | `admin@ems.com` |
| Password | `Admin@123` |

### 6. Run the app

**Without Docker:**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:4000

**With Docker:**

```bash
docker compose up --build
```

This builds and runs both the backend (port 4000) and frontend (port 3000) in containers, using the same Supabase Postgres instance via `DATABASE_URL`. No local Node install required beyond Docker itself.

To stop:
```bash
docker compose down
```

---

## Roles & Permissions

| Action | Super Admin | HR | Employee |
|---|---|---|---|
| View all employees | ✅ | ✅ | ❌ (own profile only) |
| Create employee | ✅ | ✅ | ❌ |
| Edit any employee | ✅ | ✅ (cannot assign Super Admin) | ❌ |
| Edit own profile (limited fields) | ✅ | ✅ | ✅ (phone, profileImage only) |
| Delete employee (soft delete) | ✅ | ❌ | ❌ |
| Reassign manager | ✅ | ✅ | ❌ |
| View org tree | ✅ | ✅ | ✅ |

---

## API Reference

All endpoints (except `/api/auth/login`) require a valid JWT, sent automatically via httpOnly cookie after login.

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Authenticate, sets JWT cookie |
| POST | `/api/auth/logout` | Authenticated | Clears JWT cookie |
| GET | `/api/auth/me` | Authenticated | Returns current logged-in user |

**Login request:**
```json
{ "email": "admin@ems.com", "password": "Admin@123" }
```

### Employees

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/employees` | Authenticated | Paginated list; supports `?search=&department=&role=&status=&sortBy=&page=&limit=` |
| POST | `/api/employees` | Super Admin, HR | Create employee |
| GET | `/api/employees/:id` | Authenticated | Get single employee |
| PUT | `/api/employees/:id` | Super Admin, HR (full) / Employee (own profile, phone & profileImage only) | Update employee |
| DELETE | `/api/employees/:id` | Super Admin | Soft delete |
| PATCH | `/api/employees/:id/manager` | Super Admin, HR | Reassign reporting manager; rejects if it would create a circular reporting chain |
| GET | `/api/employees/:id/reportees` | Authenticated | List direct reports |

### Organization & Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/organization/tree` | Authenticated | Full nested org chart |
| GET | `/api/dashboard/stats` | Authenticated | Total/active/inactive employee counts, department breakdown |

---

## Validation

- Email: valid format required
- Phone: numeric, required
- Salary: must be greater than 0
- Circular reporting: rejected with `400` if a manager reassignment would create a reporting loop
- HR cannot assign the `SUPER_ADMIN` role
- Employees editing their own profile can only modify `phone` and `profileImage`; other fields return `403`

---

## Screenshots

See the `/screenshots` folder in this repo.

| Screen | File |
|---|---|
| Login | `screenshots/login.png` |
| Dashboard | `screenshots/dashboard.png` |
| Employees list (search, filter, sort) | `screenshots/employees.png` |
| Employee profile / edit | `screenshots/employee-profile.png` |
| Create employee | `screenshots/new-employee.png` |
| Organization tree | `screenshots/organization.png` |

> Rename your uploaded screenshot files to match the names above (or update this table to match your actual filenames) before committing.

---

## Known Limitations / Bonus Features Implemented

- ✅ Docker Compose setup (backend + frontend, verified working end-to-end via `docker compose up --build`)
- ✅ Soft delete
- ⬜ CSV import
- ⬜ Dark mode (dark theme is default/only theme)
- ⬜ Unit tests
- ⬜ Live deployment
