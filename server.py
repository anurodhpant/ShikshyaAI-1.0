"""
SHIKSHYA AI — Unified Educational Platform
Python Flask backend (Nepal MoEST & CDC)
"""

import os, json, time, uuid, socket, datetime
from functools import wraps
from pathlib import Path

import jwt
from flask import Flask, request, jsonify, render_template, make_response, g, redirect
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "db.json"
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf","doc","docx","ppt","pptx","png","jpg","jpeg"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

JWT_SECRET = os.getenv("JWT_SECRET", "shikshya_ai_super_secret_change_me")
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 8
HOST = os.getenv("FLASK_HOST", "0.0.0.0")
PORT = int(os.getenv("FLASK_PORT", 3000))

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["SECRET_KEY"] = JWT_SECRET
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
CORS(app, supports_credentials=True)
START_TIME = time.time()


@app.after_request
def add_no_cache_headers(response):
    if response.mimetype == "text/html":
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try: s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]
    except Exception: ip = "127.0.0.1"
    finally: s.close()
    return ip


def read_db():
    if not DB_PATH.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        DB_PATH.write_text(json.dumps({
            "schools":[], "users":[], "teachers":[], "students":[],
            "classes":[], "subjects":[], "curriculum":[], "assignments":[],
            "activity":[], "uploads":[], "auditLogs":[], "announcements":[]
        }, indent=2))
    db = json.loads(DB_PATH.read_text(encoding="utf-8"))
    for k in ("teachers","students","classes","subjects","assignments",
              "activity","uploads","auditLogs","announcements"):
        db.setdefault(k, [])
    return db


def write_db(data):
    DB_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def log_audit(action, user, target, ip, result, icon="info"):
    db = read_db()
    db.setdefault("auditLogs", []).insert(0, {
        "id": f"a{int(time.time()*1000)}",
        "action": action, "user": user, "target": target, "ip": ip,
        "result": result, "time": "just now", "icon": icon,
    })
    db["auditLogs"] = db["auditLogs"][:200]
    write_db(db)


def make_token(user):
    return jwt.encode({
        "id": user["id"], "email": user["email"], "role": user["role"],
        "name": user["name"], "schoolId": user.get("schoolId"),
        "classLevel": user.get("classLevel"),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.datetime.utcnow(),
    }, JWT_SECRET, algorithm=JWT_ALGO)


def get_current_user():
    token = request.cookies.get("token")
    if not token: return None
    try: return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception: return None


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.cookies.get("token") or (
            request.headers.get("Authorization", "").replace("Bearer ", "") or None)
        if not token: return jsonify({"error": "Authentication required"}), 401
        try:
            g.user = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return wrapper


def require_role(*roles):
    def decorator(f):
        @wraps(f)
        @require_auth
        def wrapper(*args, **kwargs):
            if g.user.get("role") not in roles:
                return jsonify({"error": f"Requires role: {' or '.join(roles)}"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator


def allowed_file(fn):
    return "." in fn and fn.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def redirect_for_role(role):
    return {"superadmin":"/super-admin","schooladmin":"/school-admin",
            "teacher":"/teacher","student":"/student"}.get(role, "/auth")


def effective_school_scope(user):
    if not user: return None
    return user.get("schoolId") or None


# ---------------- PAGE ROUTES ----------------
@app.route("/")
def page_root():
    user = get_current_user()
    return redirect(redirect_for_role(user["role"]) if user else "/auth")


@app.route("/auth")
def page_auth():
    return render_template("auth-portal.html")


@app.route("/super-admin")
def page_super_admin():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] != "superadmin": return redirect(redirect_for_role(user["role"]))
    return render_template("super-admin.html", user=user)


@app.route("/school-admin")
def page_school_admin():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin.html", user=user)


@app.route("/school-admin/teachers")
def page_school_admin_teachers():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin-teachers.html", user=user)


@app.route("/school-admin/students")
def page_school_admin_students():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin-students.html", user=user)


@app.route("/school-admin/classes")
def page_school_admin_classes():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin-classes.html", user=user)


@app.route("/school-admin/syllabus")
def page_school_admin_syllabus():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin-syllabus.html", user=user)


@app.route("/school-admin/assignments")
def page_school_admin_assignments():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin","teacher"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin-assignments.html", user=user)


@app.route("/school-admin/reports")
def page_school_admin_reports():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin","teacher"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin-reports.html", user=user)


@app.route("/school-admin/student-progress")
def page_school_admin_student_progress():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin","teacher"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin-student-progress.html", user=user)


@app.route("/school-admin/announcements")
def page_school_admin_announcements():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin","teacher","student"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin-announcements.html", user=user)


@app.route("/student-report")
def page_student_report():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("schooladmin","superadmin","teacher"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("student-report.html", user=user)


# ---------------- SHARED LIST PAGES ----------------
@app.route("/teachers-list")
def page_teachers_list():
    user = get_current_user()
    if not user: return redirect("/auth")
    return render_template("teachers-list.html", user=user)


@app.route("/students-list")
def page_students_list():
    user = get_current_user()
    if not user: return redirect("/auth")
    return render_template("students-list.html", user=user)


@app.route("/course-materials-list")
def page_course_materials_list():
    user = get_current_user()
    if not user: return redirect("/auth")
    return render_template("course-materials-list.html", user=user)


@app.route("/teacher-portal")
def page_teacher_portal():
    user = get_current_user()
    if not user: return redirect("/auth")
    return render_template("teacher-portal.html", user=user)


@app.route("/student-portal")
def page_student_portal():
    user = get_current_user()
    if not user: return redirect("/auth")
    return render_template("student-portal.html", user=user)


@app.route("/teacher")
def page_teacher():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("teacher","superadmin"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("teacher-dashboard.html", user=user)


@app.route("/student")
def page_student():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("student","superadmin"):
        return redirect(redirect_for_role(user["role"]))
    return render_template("student-dashboard.html", user=user)


@app.route("/course-material")
def page_course_material():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] not in ("student","teacher","schooladmin","superadmin"):
        return redirect("/auth")
    return render_template("course-material.html", user=user)


# ---------------- AUTH API ----------------
@app.post("/api/auth/login")
def api_login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    address = (payload.get("address") or "").strip()
    role = (payload.get("role") or "student").strip()
    password = payload.get("password") or ""
    school_id = (payload.get("schoolId") or "").strip()
    name_in = (payload.get("name") or "").strip()

    if not email: return jsonify({"error": "Email is required"}), 400
    if role not in ("superadmin","schooladmin","teacher","student"):
        role = "student"

    db = read_db()

    if role != "superadmin":
        if not school_id:
            return jsonify({"error": "School is required. Please select a school or enter its code."}), 400
        if not any(s["id"] == school_id for s in db["schools"]):
            return jsonify({"error": f"School '{school_id}' not found."}), 400

    user = next((u for u in db["users"] if u["email"].lower() == email), None)

    if not user:
        new_user = {
            "id": f"u{int(time.time()*1000)}",
            "email": email, "phone": phone, "address": address,
            "password": password, "role": role,
            "name": name_in or (email.split("@")[0].title() or "User"),
            "schoolId": school_id or "",
        }
        if role == "student": new_user["classLevel"] = "10"
        db["users"].append(new_user); write_db(db); user = new_user
        log_audit("Registered on login", user["name"], f"role:{role} · {email}",
                  request.remote_addr, "SUCCESS", "person_add")
    else:
        user["role"] = role
        if name_in: user["name"] = name_in
        user["schoolId"] = school_id or ""
        if phone: user["phone"] = phone
        if address: user["address"] = address
        for i, u in enumerate(db["users"]):
            if u["id"] == user["id"]: db["users"][i] = user; break
        write_db(db)
        log_audit("Login successful", user["name"], f"role:{user['role']}",
                  request.remote_addr, "SUCCESS", "key")

    db = read_db()
    changed = False

    if user.get("role") == "teacher":
        existing = next((t for t in db.get("teachers", []) if t.get("email") == user["email"]), None)
        initial = ''.join(w[0] for w in (user.get("name") or "T").split()[:2]).upper() or "T"
        if existing:
            existing["name"] = user.get("name", existing.get("name"))
            existing["schoolId"] = user.get("schoolId", existing.get("schoolId"))
        else:
            db["teachers"].append({
                "id": f"T-{int(time.time()*1000) % 100000:05d}",
                "name": user.get("name") or "Teacher",
                "subject": "Faculty", "email": user["email"],
                "phone": user.get("phone") or "",
                "classes": [], "schoolId": user.get("schoolId") or "",
                "avatar": initial,
                "joined": datetime.datetime.utcnow().date().isoformat(),
                "status": "active", "portalUser": user["id"],
            })
        changed = True

    if user.get("role") == "student":
        existing = next((s for s in db.get("students", []) if s.get("email") == user["email"]), None)
        initial = ''.join(w[0] for w in (user.get("name") or "S").split()[:2]).upper() or "S"
        if existing:
            existing["name"] = user.get("name", existing.get("name"))
            existing["schoolId"] = user.get("schoolId", existing.get("schoolId"))
        else:
            db["students"].append({
                "id": f"S-{int(time.time()*1000) % 100000:05d}",
                "name": user.get("name") or "Student",
                "classLevel": user.get("classLevel") or "10",
                "section": "A", "roll": None,
                "email": user["email"], "phone": user.get("phone") or "",
                "schoolId": user.get("schoolId") or "",
                "gpa": None, "avatar": initial,
                "status": "active", "portalUser": user["id"],
            })
        changed = True

    if changed: write_db(db)

    if role == "superadmin" and not school_id:
        user = dict(user); user.pop("schoolId", None)

    token = make_token(user)
    resp = make_response(jsonify({
        "success": True, "token": token,
        "user": {"id": user["id"], "email": user["email"], "role": user["role"],
                 "name": user["name"], "schoolId": user.get("schoolId"),
                 "classLevel": user.get("classLevel")},
        "redirect": redirect_for_role(user["role"]),
    }))
    resp.set_cookie("token", token, max_age=JWT_EXP_HOURS*3600, httponly=True, samesite="Lax")
    return resp


@app.post("/api/auth/register")
def api_register():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    address = (payload.get("address") or "").strip()
    password = payload.get("password") or ""
    role = (payload.get("role") or "student").strip()
    school_id = (payload.get("schoolId") or "").strip()
    class_level = (payload.get("classLevel") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400
    if len(password) < 4: return jsonify({"error": "Password must be at least 4 characters"}), 400
    if role not in ("superadmin","schooladmin","teacher","student"):
        return jsonify({"error": "Invalid role"}), 400
    if role == "superadmin":
        return jsonify({"error": "Super Admin accounts cannot be self-registered"}), 403

    db = read_db()
    if any(u["email"].lower() == email for u in db["users"]):
        return jsonify({"error": f"An account with '{email}' already exists."}), 409

    if role == "student" and not class_level: class_level = "10"
    new_user = {"id": f"u{int(time.time()*1000)}", "email": email, "phone": phone,
                "address": address, "password": password, "role": role, "name": name}
    if school_id: new_user["schoolId"] = school_id
    if class_level and role == "student": new_user["classLevel"] = class_level
    db["users"].append(new_user)

    initial = ''.join(w[0] for w in name.split()[:2]).upper() or "U"
    if role == "teacher":
        db["teachers"].append({
            "id": f"T-{int(time.time()*1000) % 100000:05d}",
            "name": name, "subject": "Faculty", "email": email, "phone": phone,
            "classes": [], "schoolId": school_id or "", "avatar": initial,
            "joined": datetime.datetime.utcnow().date().isoformat(),
            "status": "active", "portalUser": new_user["id"],
        })
    if role == "student":
        db["students"].append({
            "id": f"S-{int(time.time()*1000) % 100000:05d}",
            "name": name, "classLevel": class_level or "10", "section": "A",
            "roll": None, "email": email, "phone": phone,
            "schoolId": school_id or "", "gpa": None, "avatar": initial,
            "status": "active", "portalUser": new_user["id"],
        })

    write_db(db)
    log_audit("User Registered", name, f"role:{role} · {email}",
              request.remote_addr, "SUCCESS", "person_add")

    token = make_token(new_user)
    resp = make_response(jsonify({
        "success": True, "token": token,
        "user": {"id": new_user["id"], "email": new_user["email"], "role": new_user["role"],
                 "name": new_user["name"], "schoolId": new_user.get("schoolId"),
                 "classLevel": new_user.get("classLevel")},
        "redirect": redirect_for_role(new_user["role"]),
    }))
    resp.set_cookie("token", token, max_age=JWT_EXP_HOURS*3600, httponly=True, samesite="Lax")
    return resp, 201


@app.post("/api/auth/logout")
def api_logout():
    resp = make_response(jsonify({"success": True}))
    resp.delete_cookie("token")
    return resp


@app.get("/api/auth/me")
@require_auth
def api_me():
    return jsonify({"user": g.user})


# ---------------- DATA APIS ----------------
@app.get("/api/schools")
def api_list_schools():
    db = read_db()
    return jsonify({"schools": db["schools"], "total": len(db["schools"])})


@app.get("/api/schools/<school_id>")
def api_get_school(school_id):
    db = read_db()
    school = next((s for s in db["schools"] if s["id"] == school_id), None)
    if not school: return jsonify({"error": "School not found"}), 404
    return jsonify(school)


@app.get("/api/users")
@require_role("superadmin","schooladmin")
def api_list_users():
    db = read_db()
    scope = effective_school_scope(g.user)
    users = db["users"]
    if scope: users = [u for u in users if u.get("schoolId") == scope]
    safe = [{k:v for k,v in u.items() if k != "password"} for u in users]
    return jsonify({"users": safe, "total": len(safe), "scope": scope})


@app.get("/api/users/me")
@require_auth
def api_my_profile():
    db = read_db()
    user = next((u for u in db["users"] if u["id"] == g.user["id"]), None)
    if not user: return jsonify({"error": "User not found"}), 404
    out = {k:v for k,v in user.items() if k != "password"}
    if g.user.get("role") == "superadmin":
        out["schoolId"] = g.user.get("schoolId")
    return jsonify(out)


@app.get("/api/teachers")
@require_auth
def api_list_teachers():
    db = read_db()
    scope = effective_school_scope(g.user)
    items = db.get("teachers", [])
    if scope: items = [t for t in items if t.get("schoolId") == scope]
    return jsonify({"teachers": items, "total": len(items), "scope": scope})


@app.get("/api/teachers/<teacher_id>")
@require_auth
def api_get_teacher(teacher_id):
    db = read_db()
    t = next((x for x in db.get("teachers", []) if x["id"] == teacher_id), None)
    if not t: return jsonify({"error": "Teacher not found"}), 404
    return jsonify(t)


@app.get("/api/students")
@require_auth
def api_list_students():
    db = read_db()
    scope = effective_school_scope(g.user)
    items = db.get("students", [])
    if scope: items = [s for s in items if s.get("schoolId") == scope]
    cls = request.args.get("class")
    if cls: items = [s for s in items if str(s.get("classLevel")) == str(cls)]
    return jsonify({"students": items, "total": len(items), "scope": scope})


@app.get("/api/students/<student_id>")
@require_auth
def api_get_student(student_id):
    db = read_db()
    s = next((x for x in db.get("students", []) if x["id"] == student_id), None)
    if not s: return jsonify({"error": "Student not found"}), 404
    return jsonify(s)


@app.get("/api/student-report/<student_id>")
@require_auth
def api_student_report(student_id):
    db = read_db()
    student = next((s for s in db.get("students", []) if s["id"] == student_id), None)
    if not student: return jsonify({"error": "Student not found"}), 404

    seed = sum(ord(c) for c in student_id)
    subjects = ["Mathematics", "Science", "English", "Nepali", "Social Studies"]
    subject_scores = []
    for i, subj in enumerate(subjects):
        score = 60 + ((seed * (i + 3)) % 40)
        subject_scores.append({"subject": subj, "score": score})

    attendance = 80 + (seed % 20)
    overall = round(sum(s["score"] for s in subject_scores) / len(subject_scores))

    return jsonify({
        "student": student,
        "subjects": subject_scores,
        "attendance": attendance,
        "overall": overall,
        "gpa": student.get("gpa") or round(overall / 25, 2),
        "grade": "A" if overall >= 85 else "B" if overall >= 70 else "C" if overall >= 55 else "D",
        "remarks": "Excellent performance" if overall >= 85 else "Good, keep improving" if overall >= 70 else "Needs attention"
    })


@app.get("/api/classes")
@require_auth
def api_list_classes():
    db = read_db()
    return jsonify({"classes": db.get("classes", [])})


@app.get("/api/subjects")
@require_auth
def api_list_subjects():
    db = read_db()
    return jsonify({"subjects": db.get("subjects", [])})


@app.get("/api/assignments")
@require_auth
def api_list_assignments():
    db = read_db()
    scope = effective_school_scope(g.user)
    items = db.get("assignments", [])
    if scope: items = [a for a in items if a.get("schoolId") == scope]
    return jsonify({"assignments": items, "total": len(items)})


@app.get("/api/activity")
@require_auth
def api_list_activity():
    db = read_db()
    return jsonify({"activity": db.get("activity", [])})


@app.get("/api/announcements")
@require_auth
def api_list_announcements():
    db = read_db()
    scope = effective_school_scope(g.user)
    items = db.get("announcements", [])
    if scope: items = [a for a in items if a.get("schoolId") == scope]
    return jsonify({"announcements": items, "total": len(items)})


@app.get("/api/curriculum")
def api_list_curriculum():
    db = read_db()
    cls = request.args.get("class")
    items = db["curriculum"]
    if cls: items = [c for c in items if str(c.get("class")) == str(cls)]
    return jsonify({"curriculum": items, "total": len(items)})


@app.get("/api/course-materials")
@require_auth
def api_course_materials():
    db = read_db()
    cls = request.args.get("class")
    curriculum = db.get("curriculum", [])
    if cls: curriculum = [c for c in curriculum if str(c.get("class")) == str(cls)]
    scope = effective_school_scope(g.user)
    uploads = db.get("uploads", [])
    if scope: uploads = [u for u in uploads if u.get("schoolId") == scope]
    return jsonify({"curriculum": curriculum, "uploads": uploads, "scope": scope})


@app.get("/api/uploads")
@require_auth
def api_list_uploads():
    db = read_db()
    uploads = db.get("uploads", [])
    scope = effective_school_scope(g.user)
    if scope: uploads = [u for u in uploads if u.get("schoolId") == scope]
    cls = request.args.get("class")
    subject = request.args.get("subject")
    if cls: uploads = [u for u in uploads if str(u.get("classLevel")) == str(cls)]
    if subject: uploads = [u for u in uploads if str(u.get("subject","")).lower() == subject.lower()]
    return jsonify({"uploads": uploads, "total": len(uploads), "scope": scope})


@app.post("/api/uploads")
@require_role("teacher","schooladmin","superadmin")
def api_upload():
    if "file" not in request.files: return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    subject = (request.form.get("subject") or "").strip()
    class_level = (request.form.get("classLevel") or "").strip()
    title = (request.form.get("title") or "").strip()

    if not file or file.filename == "": return jsonify({"error": "No file selected"}), 400
    if not subject or not class_level: return jsonify({"error": "Subject and Class are required"}), 400
    if not allowed_file(file.filename): return jsonify({"error": "File type not allowed"}), 400

    original = secure_filename(file.filename)
    unique = f"{uuid.uuid4().hex[:8]}_{original}"
    dest = UPLOAD_DIR / unique
    file.save(dest)
    size_kb = round(dest.stat().st_size / 1024, 1)
    ext = original.rsplit(".",1)[1].lower()

    record = {
        "id": f"up{int(time.time()*1000)}", "title": title or original,
        "filename": unique, "originalName": original, "ext": ext, "sizeKB": size_kb,
        "subject": subject, "classLevel": class_level,
        "uploadedBy": g.user["name"], "uploadedById": g.user["id"],
        "schoolId": g.user.get("schoolId") or "",
        "uploadedAt": datetime.datetime.utcnow().isoformat()+"Z",
        "url": f"/static/uploads/{unique}",
    }
    db = read_db(); db.setdefault("uploads", []).insert(0, record); write_db(db)

    # Also create a matching "assignment" entry so it shows on the Assignments page
    db = read_db()
    db.setdefault("assignments", []).insert(0, {
        "id": f"A-{int(time.time()*1000) % 100000:05d}",
        "title": title or original,
        "subject": subject,
        "classLevel": class_level,
        "section": "A",
        "due": datetime.datetime.utcnow().date().isoformat(),
        "status": "Pending",
        "uploadedBy": g.user["name"],
        "schoolId": g.user.get("schoolId") or "",
        "uploadId": record["id"],
    })
    write_db(db)

    log_audit("Study Material Uploaded", g.user["name"], f"{class_level} · {subject} · {original}",
              request.remote_addr, "SUCCESS", "upload_file")
    return jsonify({"success": True, "upload": record}), 201


@app.get("/api/audit")
@require_role("superadmin")
def api_audit_logs():
    db = read_db()
    logs = db.get("auditLogs", [])
    scope = effective_school_scope(g.user)
    if scope: logs = [l for l in logs if scope in str(l.get("target",""))]
    return jsonify({"logs": logs, "total": len(logs), "scope": scope})


@app.get("/api/health")
def api_health():
    return jsonify({"status":"ok","node":"Kathmandu Central CDC","version":"2.4.9",
                    "uptime": round(time.time()-START_TIME,2),
                    "timestamp": datetime.datetime.utcnow().isoformat()+"Z"})


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error":"Not Found","path":request.path}), 404
    return redirect("/auth")


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": f"File too large. Max {MAX_UPLOAD_BYTES//(1024*1024)} MB"}), 413


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error":"Server Error","message":str(e)}), 500


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG","true").lower() == "true"
    lan_ip = get_lan_ip()
    print(f"\n{'='*60}\n  SHIKSHYA AI — running\n{'='*60}")
    print(f"  Local:   http://localhost:{PORT}")
    print(f"  Network: http://{lan_ip}:{PORT}")
    print(f"{'='*60}\n")
    app.run(host=HOST, port=PORT, debug=debug)