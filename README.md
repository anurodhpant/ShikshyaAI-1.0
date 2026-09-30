# SHIKSHYA AI — Unified Educational Platform

Nepal MoEST & CDC Unified Portal (Python Flask + Tailwind)

## Quick Start

```bash
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
python server.py
```

Open Chrome: **http://localhost:3000**

## Demo Credentials

| Role         | Email                            | Password    |
|--------------|----------------------------------|-------------|
| Super Admin  | superadmin.cdc@moest.gov.np      | admin123    |
| School Admin | principal@kmhss.edu.np           | admin123    |
| Teacher      | t.subedi@kmhss.edu.np            | teacher123  |
| Student      | student.aarav@kmhss.edu.np       | student123  |

## Routes

- `/`               → Portal hub
- `/auth`           → Login portal
- `/super-admin`    → National CDC dashboard
- `/school-admin`   → Institutional admin
- `/teacher`        → Teacher dashboard
- `/student`        → Student dashboard

## API Endpoints

- `POST   /api/auth/login`
- `POST   /api/auth/logout`
- `GET    /api/auth/me`
- `GET    /api/schools`
- `POST   /api/schools`             (superadmin)
- `PATCH  /api/schools/<id>/status` (superadmin)
- `GET    /api/users`               (superadmin, schooladmin)
- `GET    /api/users/me`
- `GET    /api/curriculum`
- `POST   /api/curriculum/<id>/approve` (superadmin)
- `GET    /api/audit`               (superadmin)
- `GET    /api/health`

## Layout

```
server.py              → Flask app
requirements.txt       → Python deps
data/db.json           → JSON "database"
templates/*.html       → Jinja templates
static/css/*.css       → Stylesheets
static/js/*.js         → Frontend logic
```