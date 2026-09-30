"""
SHIKSHYA AI — Unified Educational Platform
Python Flask backend (Nepal MoEST & CDC)

DEV MODE: any email + any password accepted.
"""

import os
import json
import time
import uuid
import datetime
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

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "ppt", "pptx", "png", "jpg", "jpeg"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

JWT_SECRET = os.getenv("JWT_SECRET", "shikshya_ai_super_secret_change_me")
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 8

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["SECRET_KEY"] = JWT_SECRET
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
CORS(app, supports_credentials=True)

START_TIME = time.time()


# ---------------- DB helpers ----------------
def read_db():
    if not DB_PATH.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        DB_PATH.write_text(json.dumps(
            {"schools": [], "users": [], "curriculum": [], "uploads": [], "auditLogs": []},
            indent=2
        ))
    return json.loads(DB_PATH.read_text(encoding="utf-8"))


def write_db(data):
    DB_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def log_audit(action, user, target, ip, result, icon="info"):
    db = read_db()
    db.setdefault("auditLogs", []).insert(0, {
        "id": f"a{int(time.time() * 1000)}",
        "action": action, "user": user, "target": target, "ip": ip,
        "result": result, "time": "just now", "icon": icon,
    })
    db["auditLogs"] = db["auditLogs"][:200]
    write_db(db)


# ---------------- Auth helpers ----------------
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
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        return None


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.cookies.get("token") or (
            request.headers.get("Authorization", "").replace("Bearer ", "") or None
        )
        if not token:
            return jsonify({"error": "Authentication required"}), 401
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


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def redirect_for_role(role):
    return {
        "superadmin": "/super-admin",
        "schooladmin": "/school-admin",
        "teacher": "/teacher",
        "student": "/student",
    }.get(role, "/auth")


# ---------------- Page routes (role-guarded) ----------------
@app.route("/")
def page_root():
    user = get_current_user()
    return redirect(redirect_for_role(user["role"]) if user else "/auth")


@app.route("/auth")
def page_auth():
    user = get_current_user()
    if user:
        return redirect(redirect_for_role(user["role"]))
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
    if user["role"] != "schooladmin": return redirect(redirect_for_role(user["role"]))
    return render_template("school-admin.html", user=user)


@app.route("/teacher")
def page_teacher():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] != "teacher": return redirect(redirect_for_role(user["role"]))
    return render_template("teacher-dashboard.html", user=user)


@app.route("/student")
def page_student():
    user = get_current_user()
    if not user: return redirect("/auth")
    if user["role"] != "student": return redirect(redirect_for_role(user["role"]))
    return render_template("student-dashboard.html", user=user)


@app.route("/course-material")
def page_course_material():
    user = get_current_user()
    if not user:
        return redirect("/auth")
    if user["role"] not in ("student", "teacher", "schooladmin", "superadmin"):
        return redirect("/auth")
    return render_template("course-material.html", user=user)


# ---------------- Auth API ----------------
@app.post("/api/auth/login")
def api_login():
    """
    DEV MODE: accepts any email + any password.
    - If the email exists -> log them in (with the role from the role box).
    - If the email doesn't exist -> auto-create the account with the chosen role.
    - Password is ignored completely.
    """
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    address = (payload.get("address") or "").strip()
    role = (payload.get("role") or "student").strip()
    password = payload.get("password") or ""   # stored but not verified

    if not email:
        return jsonify({"error": "Email is required"}), 400
    if role not in ("superadmin", "schooladmin", "teacher", "student"):
        role = "student"

    db = read_db()

    # Find existing user by email (fallback: phone)
    user = next((u for u in db["users"] if u["email"].lower() == email), None)
    if not user and phone:
        user = next((u for u in db["users"] if u.get("phone") == phone), None)

    # If not found -> auto-create
    if not user:
        new_user = {
            "id": f"u{int(time.time() * 1000)}",
            "email": email,
            "phone": phone,
            "address": address,
            "password": password,
            "role": role,
            "name": email.split("@")[0].title() or "User",
        }
        if role == "student":
            new_user["classLevel"] = "10"
        db["users"].append(new_user)
        write_db(db)
        user = new_user
        log_audit("Auto-registered on login", user["name"],
                  f"role:{role} · {email}", request.remote_addr, "SUCCESS", "person_add")
    else:
        # If a different role was selected, trust the UI (dev convenience)
        if role and user.get("role") != role:
            user["role"] = role
            if role == "student" and not user.get("classLevel"):
                user["classLevel"] = "10"
            # persist
            for i, u in enumerate(db["users"]):
                if u["id"] == user["id"]:
                    db["users"][i] = user
                    break
            write_db(db)
        log_audit("Login successful", user["name"], f"role:{user['role']}",
                  request.remote_addr, "SUCCESS", "key")

    token = make_token(user)
    redirect_to = redirect_for_role(user["role"])

    resp = make_response(jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"], "role": user["role"],
            "name": user["name"], "schoolId": user.get("schoolId"),
            "classLevel": user.get("classLevel"),
        },
        "redirect": redirect_to,
    }))
    resp.set_cookie("token", token, max_age=JWT_EXP_HOURS * 3600,
                    httponly=True, samesite="Lax")
    return resp


@app.post("/api/auth/register")
def api_register():
    """Manual registration endpoint (still works if you use the Sign Up tab)."""
    payload = request.get_json(silent=True) or {}

    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    address = (payload.get("address") or "").strip()
    password = payload.get("password") or ""
    role = (payload.get("role") or "student").strip()
    school_id = (payload.get("schoolId") or "").strip()
    class_level = (payload.get("classLevel") or "").strip()

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not email:
        return jsonify({"error": "Email is required"}), 400
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "Please enter a valid email address"}), 400
    if not password:
        return jsonify({"error": "Password is required"}), 400
    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters"}), 400
    if role not in ("superadmin", "schooladmin", "teacher", "student"):
        return jsonify({"error": "Invalid role"}), 400
    if role == "superadmin":
        return jsonify({"error": "Super Admin accounts cannot be self-registered"}), 403

    db = read_db()

    if any(u["email"].lower() == email for u in db["users"]):
        return jsonify({"error": f"An account with '{email}' already exists. Please sign in instead."}), 409
    if phone and any(u.get("phone") == phone for u in db["users"]):
        return jsonify({"error": f"An account with phone '{phone}' already exists."}), 409

    if school_id and not any(s["id"] == school_id for s in db["schools"]):
        return jsonify({"error": "Selected school does not exist"}), 400

    if role == "student" and not class_level:
        class_level = "10"

    new_user = {
        "id": f"u{int(time.time() * 1000)}",
        "email": email,
        "phone": phone,
        "address": address,
        "password": password,
        "role": role,
        "name": name,
    }
    if school_id:
        new_user["schoolId"] = school_id
    if class_level and role == "student":
        new_user["classLevel"] = class_level

    db["users"].append(new_user)
    write_db(db)

    log_audit("User Registered", name, f"role:{role} · {email}",
              request.remote_addr, "SUCCESS", "person_add")

    token = make_token(new_user)
    resp = make_response(jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": new_user["id"], "email": new_user["email"],
            "role": new_user["role"], "name": new_user["name"],
            "schoolId": new_user.get("schoolId"),
            "classLevel": new_user.get("classLevel"),
        },
        "redirect": redirect_for_role(new_user["role"]),
    }))
    resp.set_cookie("token", token, max_age=JWT_EXP_HOURS * 3600,
                    httponly=True, samesite="Lax")
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


# ---------------- Schools API ----------------
@app.get("/api/schools")
def api_list_schools():
    db = read_db()
    return jsonify({"schools": db["schools"], "total": len(db["schools"])})


@app.get("/api/schools/<school_id>")
def api_get_school(school_id):
    db = read_db()
    school = next((s for s in db["schools"] if s["id"] == school_id), None)
    if not school:
        return jsonify({"error": "School not found"}), 404
    return jsonify(school)


@app.post("/api/schools")
@require_role("superadmin")
def api_create_school():
    payload = request.get_json(silent=True) or {}
    sid = (payload.get("id") or "").strip()
    name = (payload.get("name") or "").strip()
    if not sid or not name:
        return jsonify({"error": "id and name required"}), 400
    db = read_db()
    if any(s["id"] == sid for s in db["schools"]):
        return jsonify({"error": "School already exists"}), 409
    new_school = {
        "id": sid, "name": name, "province": payload.get("province", "Bagmati"),
        "classes": payload.get("classes", "6-12"), "status": "active",
        "students": 0, "teachers": 0, "aiEnabled": 0,
    }
    db["schools"].append(new_school)
    write_db(db)
    log_audit("School Created", g.user["name"], sid, request.remote_addr, "SUCCESS", "add_business")
    return jsonify(new_school), 201


@app.patch("/api/schools/<school_id>/status")
@require_role("superadmin")
def api_update_school_status(school_id):
    payload = request.get_json(silent=True) or {}
    db = read_db()
    school = next((s for s in db["schools"] if s["id"] == school_id), None)
    if not school:
        return jsonify({"error": "School not found"}), 404
    school["status"] = payload.get("status", school["status"])
    write_db(db)
    log_audit("School Status Updated", g.user["name"], f"{school_id}:{school['status']}", request.remote_addr, "SUCCESS", "tune")
    return jsonify(school)


# ---------------- Users API ----------------
@app.get("/api/users")
@require_role("superadmin", "schooladmin")
def api_list_users():
    db = read_db()
    safe = [{k: v for k, v in u.items() if k != "password"} for u in db["users"]]
    return jsonify({"users": safe, "total": len(safe)})


@app.get("/api/users/me")
@require_auth
def api_my_profile():
    db = read_db()
    user = next((u for u in db["users"] if u["id"] == g.user["id"]), None)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({k: v for k, v in user.items() if k != "password"})


# ---------------- Curriculum API ----------------
@app.get("/api/curriculum")
def api_list_curriculum():
    db = read_db()
    class_filter = request.args.get("class")
    items = db["curriculum"]
    if class_filter:
        items = [c for c in items if str(c.get("class")) == str(class_filter)]
    return jsonify({"curriculum": items, "total": len(items)})


@app.post("/api/curriculum/<item_id>/approve")
@require_role("superadmin")
def api_approve_curriculum(item_id):
    db = read_db()
    item = next((c for c in db["curriculum"] if c["id"] == item_id), None)
    if not item:
        return jsonify({"error": "Curriculum item not found"}), 404
    item["status"] = "approved"
    item["prepared"] = 100
    write_db(db)
    log_audit("Curriculum Approved", g.user["name"], item_id, request.remote_addr, "SUCCESS", "verified")
    return jsonify(item)


# ---------------- Uploads API ----------------
@app.get("/api/uploads")
@require_auth
def api_list_uploads():
    db = read_db()
    uploads = db.get("uploads", [])
    class_filter = request.args.get("class")
    subject_filter = request.args.get("subject")
    if class_filter:
        uploads = [u for u in uploads if str(u.get("classLevel")) == str(class_filter)]
    if subject_filter:
        uploads = [u for u in uploads if str(u.get("subject", "")).lower() == subject_filter.lower()]
    return jsonify({"uploads": uploads, "total": len(uploads)})


@app.post("/api/uploads")
@require_role("teacher", "schooladmin", "superadmin")
def api_upload():
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files["file"]
    subject = (request.form.get("subject") or "").strip()
    class_level = (request.form.get("classLevel") or "").strip()
    title = (request.form.get("title") or "").strip()

    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not subject or not class_level:
        return jsonify({"error": "Subject and Class are required"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": f"File type not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    original = secure_filename(file.filename)
    unique = f"{uuid.uuid4().hex[:8]}_{original}"
    dest = UPLOAD_DIR / unique
    file.save(dest)

    size_kb = round(dest.stat().st_size / 1024, 1)
    ext = original.rsplit(".", 1)[1].lower()

    record = {
        "id": f"up{int(time.time() * 1000)}",
        "title": title or original,
        "filename": unique,
        "originalName": original,
        "ext": ext,
        "sizeKB": size_kb,
        "subject": subject,
        "classLevel": class_level,
        "uploadedBy": g.user["name"],
        "uploadedById": g.user["id"],
        "uploadedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "url": f"/static/uploads/{unique}",
    }

    db = read_db()
    db.setdefault("uploads", []).insert(0, record)
    write_db(db)
    log_audit("Study Material Uploaded", g.user["name"],
              f"{class_level} · {subject} · {original}",
              request.remote_addr, "SUCCESS", "upload_file")
    return jsonify({"success": True, "upload": record}), 201


@app.delete("/api/uploads/<upload_id>")
@require_role("teacher", "schooladmin", "superadmin")
def api_delete_upload(upload_id):
    db = read_db()
    uploads = db.get("uploads", [])
    item = next((u for u in uploads if u["id"] == upload_id), None)
    if not item:
        return jsonify({"error": "Upload not found"}), 404
    if g.user["role"] != "superadmin" and item["uploadedById"] != g.user["id"]:
        return jsonify({"error": "Not allowed"}), 403
    try:
        (UPLOAD_DIR / item["filename"]).unlink(missing_ok=True)
    except Exception:
        pass
    db["uploads"] = [u for u in uploads if u["id"] != upload_id]
    write_db(db)
    log_audit("Upload Deleted", g.user["name"], item["originalName"],
              request.remote_addr, "SUCCESS", "delete")
    return jsonify({"success": True})


# ---------------- Audit API ----------------
@app.get("/api/audit")
@require_role("superadmin")
def api_audit_logs():
    db = read_db()
    return jsonify({"logs": db.get("auditLogs", []), "total": len(db.get("auditLogs", []))})


# ---------------- Health ----------------
@app.get("/api/health")
def api_health():
    return jsonify({
        "status": "ok", "node": "Kathmandu Central CDC", "version": "2.4.9",
        "uptime": round(time.time() - START_TIME, 2),
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    })


# ---------------- Errors ----------------
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not Found", "path": request.path}), 404
    return redirect("/auth")


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": f"File too large. Max {MAX_UPLOAD_BYTES // (1024*1024)} MB"}), 413


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Server Error", "message": str(e)}), 500


if __name__ == "__main__":
    # Local: uses FLASK_PORT from .env (3000)
    # Render: uses PORT injected by Render
    port = int(os.environ.get("PORT") or os.getenv("FLASK_PORT", 3000))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)