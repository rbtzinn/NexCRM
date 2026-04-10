from dotenv import load_dotenv
load_dotenv()

import os
import time
import bcrypt
import jwt
import random
from pathlib import Path
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from contextlib import asynccontextmanager

# ─── Config ────────────────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "nexcrm-dev-secret")
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nexcrm.io")
ADMIN_PWD = os.environ.get("ADMIN_PASSWORD", "Admin@123!")
MANAGER_EMAIL = os.environ.get("MANAGER_EMAIL", "sarah.chen@nexcrm.io")
MANAGER_PWD = os.environ.get("MANAGER_PASSWORD", "Manager@123!")
ANALYST_EMAIL = os.environ.get("ANALYST_EMAIL", "marcus.johnson@nexcrm.io")
ANALYST_PWD = os.environ.get("ANALYST_PASSWORD", "Analyst@123!")
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MEMORY_DIR = PROJECT_ROOT / "memory"
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
RUNNING_ON_VERCEL = os.environ.get("VERCEL") == "1"


def env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


PUBLIC_DEMO_MODE = env_bool("PUBLIC_DEMO_MODE", RUNNING_ON_VERCEL)
DEMO_READ_ONLY = env_bool("DEMO_READ_ONLY", RUNNING_ON_VERCEL)
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("RATE_LIMIT_MAX_REQUESTS", "120"))
LOGIN_RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("LOGIN_RATE_LIMIT_WINDOW_SECONDS", "900"))
LOGIN_RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("LOGIN_RATE_LIMIT_MAX_REQUESTS", "12"))
WRITE_RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("WRITE_RATE_LIMIT_WINDOW_SECONDS", "300"))
WRITE_RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("WRITE_RATE_LIMIT_MAX_REQUESTS", "30"))
SAFE_MUTATION_PATHS = {"/api/auth/login", "/api/auth/logout"}
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
rate_limit_store = defaultdict(deque)

# ─── MongoDB ───────────────────────────────────────────────────────────────────
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ─── Helpers ───────────────────────────────────────────────────────────────────
def oid(id_str: str):
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(400, "Invalid ID")


def serialize(doc):
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    for k, v in list(d.items()):
        if isinstance(v, ObjectId):
            d[k] = str(v)
        elif isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


def serialize_list(docs):
    return [serialize(d) for d in docs]


def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_pw(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def make_token(user_id: str, email: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode(
        {"sub": user_id, "email": email, "role": role, "exp": exp, "type": "access"},
        JWT_SECRET, algorithm=JWT_ALGO
    )


def get_request_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def hit_rate_limit(bucket_key: str, limit: int, window_seconds: int) -> Optional[int]:
    now = time.time()
    bucket = rate_limit_store[bucket_key]
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= limit:
        retry_after = max(1, int(window_seconds - (now - bucket[0])))
        return retry_after
    bucket.append(now)
    return None


def clean_audit_payload(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not payload:
        return {}
    cleaned = {}
    for key, value in payload.items():
        if value is None:
            continue
        if isinstance(value, ObjectId):
            cleaned[key] = str(value)
        elif isinstance(value, datetime):
            cleaned[key] = value.isoformat()
        elif isinstance(value, list):
            cleaned[key] = [str(item) if isinstance(item, ObjectId) else item for item in value]
        else:
            cleaned[key] = value
    return cleaned


async def audit_event(
    action: str,
    entity_type: str,
    actor: Optional[Dict[str, Any]] = None,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    request: Optional[Request] = None,
    metadata: Optional[Dict[str, Any]] = None,
):
    now = datetime.now(timezone.utc)
    actor = actor or {}
    doc = {
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "actor_id": actor.get("id"),
        "actor_name": actor.get("name"),
        "actor_email": actor.get("email"),
        "actor_role": actor.get("role"),
        "ip_address": get_request_ip(request) if request else None,
        "metadata": clean_audit_payload(metadata),
        "created_at": now,
    }
    await db.audit_logs.insert_one(doc)


def build_search_item(item_type: str, doc: Dict[str, Any]) -> Dict[str, Any]:
    if item_type == "customer":
        return {
            "id": str(doc["_id"]),
            "type": item_type,
            "title": doc.get("name"),
            "subtitle": doc.get("company"),
            "description": doc.get("email") or doc.get("phone"),
            "status": doc.get("status"),
            "route": "/customers",
        }
    if item_type == "deal":
        return {
            "id": str(doc["_id"]),
            "type": item_type,
            "title": doc.get("title"),
            "subtitle": doc.get("customer_name"),
            "description": f"${doc.get('value', 0):,.0f}",
            "status": doc.get("stage"),
            "route": "/deals",
        }
    if item_type == "task":
        return {
            "id": str(doc["_id"]),
            "type": item_type,
            "title": doc.get("title"),
            "subtitle": doc.get("assignee_name"),
            "description": doc.get("description"),
            "status": doc.get("status"),
            "route": "/tasks",
        }
    return {
        "id": str(doc["_id"]),
        "type": item_type,
        "title": doc.get("name"),
        "subtitle": doc.get("email"),
        "description": doc.get("department"),
        "status": doc.get("role"),
        "route": "/users",
    }


# ─── Auth deps ─────────────────────────────────────────────────────────────────
async def get_user(request: Request):
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        u = serialize(user)
        u.pop("password_hash", None)
        return u
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def admin_only(user=Depends(get_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    return user


async def manager_plus(user=Depends(get_user)):
    if user["role"] not in ("admin", "manager"):
        raise HTTPException(403, "Manager+ required")
    return user


# ─── Pydantic Models ───────────────────────────────────────────────────────────
class LoginReq(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "analyst"
    department: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerIn(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: str
    industry: Optional[str] = None
    status: str = "lead"
    value: float = 0
    source: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = None
    value: Optional[float] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class DealIn(BaseModel):
    title: str
    customer_id: str
    customer_name: Optional[str] = None
    stage: str = "lead"
    value: float = 0
    probability: int = 10
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None


class DealUpdate(BaseModel):
    title: Optional[str] = None
    stage: Optional[str] = None
    value: Optional[float] = None
    probability: Optional[int] = None
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None


class TaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
    deal_id: Optional[str] = None
    priority: str = "medium"
    status: str = "todo"
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None


# ─── App ───────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await setup_db()
    yield


app = FastAPI(title="NexCRM API", lifespan=lifespan)

allowed_origins = ["*"] if CORS_ORIGINS.strip() == "*" else [
    origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def protect_public_demo(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/"):
        request_ip = get_request_ip(request)

        retry_after = hit_rate_limit(
            f"global:{request_ip}",
            RATE_LIMIT_MAX_REQUESTS,
            RATE_LIMIT_WINDOW_SECONDS,
        )
        if retry_after:
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(retry_after)},
                content={"detail": "Too many requests. Please slow down and try again soon."},
            )

        if path == "/api/auth/login":
            retry_after = hit_rate_limit(
                f"login:{request_ip}",
                LOGIN_RATE_LIMIT_MAX_REQUESTS,
                LOGIN_RATE_LIMIT_WINDOW_SECONDS,
            )
            if retry_after:
                return JSONResponse(
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                    content={"detail": "Too many login attempts. Please try again later."},
                )

        if request.method in MUTATING_METHODS and path not in SAFE_MUTATION_PATHS:
            if DEMO_READ_ONLY:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "This public demo is read-only. Contact Roberto for a full walkthrough."},
                )

            retry_after = hit_rate_limit(
                f"write:{request_ip}",
                WRITE_RATE_LIMIT_MAX_REQUESTS,
                WRITE_RATE_LIMIT_WINDOW_SECONDS,
            )
            if retry_after:
                return JSONResponse(
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                    content={"detail": "Write limit reached for this demo. Please try again later."},
                )

    return await call_next(request)


# ─── Health ────────────────────────────────────────────────────────────────────
@app.get("/api/")
async def health():
    return {"status": "ok", "service": "NexCRM API v1.0"}


# ─── AUTH ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
async def login(req: LoginReq, request: Request):
    user = await db.users.find_one({"email": req.email.lower().strip()})
    if not user or not verify_pw(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(401, "Account deactivated")
    token = make_token(str(user["_id"]), user["email"], user["role"])
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    u = serialize(user)
    u.pop("password_hash", None)
    await audit_event(
        action="login",
        entity_type="auth",
        actor=u,
        entity_id=u["id"],
        entity_name=u["name"],
        request=request,
    )
    return {"token": token, "user": u}


@app.get("/api/auth/me")
async def me(user=Depends(get_user)):
    return user


@app.post("/api/auth/logout")
async def logout(user=Depends(get_user)):
    return {"message": "Logged out"}


@app.get("/api/search/global")
async def global_search(
    q: str = Query(..., min_length=1),
    user=Depends(get_user),
):
    pattern = {"$regex": q, "$options": "i"}

    customers = await db.customers.find({
        "$or": [
            {"name": pattern},
            {"company": pattern},
            {"email": pattern},
        ]
    }).sort("updated_at", -1).limit(5).to_list(5)

    deals = await db.deals.find({
        "$or": [
            {"title": pattern},
            {"customer_name": pattern},
            {"notes": pattern},
        ]
    }).sort("updated_at", -1).limit(5).to_list(5)

    tasks = await db.tasks.find({
        "$or": [
            {"title": pattern},
            {"description": pattern},
            {"assignee_name": pattern},
        ]
    }).sort("updated_at", -1).limit(5).to_list(5)

    results = {
        "customers": [build_search_item("customer", doc) for doc in customers],
        "deals": [build_search_item("deal", doc) for doc in deals],
        "tasks": [build_search_item("task", doc) for doc in tasks],
    }

    if user["role"] == "admin":
        users = await db.users.find({
            "$or": [
                {"name": pattern},
                {"email": pattern},
                {"department": pattern},
            ]
        }).sort("created_at", -1).limit(5).to_list(5)
        results["users"] = [build_search_item("user", doc) for doc in users]

    total = sum(len(group) for group in results.values())
    return {"query": q, "total": total, "results": results}


@app.get("/api/audit-logs")
async def list_audit_logs(
    user=Depends(admin_only),
    search: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = {}
    if action:
        query["action"] = action
    if entity_type:
        query["entity_type"] = entity_type
    if search:
        query["$or"] = [
            {"entity_name": {"$regex": search, "$options": "i"}},
            {"actor_name": {"$regex": search, "$options": "i"}},
            {"actor_email": {"$regex": search, "$options": "i"}},
        ]

    total = await db.audit_logs.count_documents(query)
    skip = (page - 1) * limit
    docs = await db.audit_logs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "data": serialize_list(docs),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


# ─── USERS ─────────────────────────────────────────────────────────────────────
@app.get("/api/users")
async def list_users(user=Depends(admin_only)):
    users = await db.users.find().sort("created_at", -1).to_list(100)
    result = []
    for u in users:
        uu = serialize(u)
        uu.pop("password_hash", None)
        result.append(uu)
    return result


@app.post("/api/users")
async def create_user(body: UserCreate, request: Request, user=Depends(admin_only)):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email already exists")
    now = datetime.now(timezone.utc)
    doc = {
        "email": body.email.lower(),
        "password_hash": hash_pw(body.password),
        "name": body.name,
        "role": body.role,
        "department": body.department,
        "is_active": True,
        "created_at": now,
        "last_login": None,
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    u = serialize(doc)
    u.pop("password_hash", None)
    await audit_event(
        action="create",
        entity_type="user",
        actor=user,
        entity_id=u["id"],
        entity_name=u["name"],
        request=request,
        metadata={"role": u["role"], "department": u.get("department")},
    )
    return u


@app.get("/api/users/{uid}")
async def get_user_by_id(uid: str, user=Depends(admin_only)):
    u = await db.users.find_one({"_id": oid(uid)})
    if not u:
        raise HTTPException(404, "User not found")
    uu = serialize(u)
    uu.pop("password_hash", None)
    return uu


@app.put("/api/users/{uid}")
async def update_user(uid: str, body: UserUpdate, request: Request, user=Depends(admin_only)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    updates["updated_at"] = datetime.now(timezone.utc)
    res = await db.users.update_one({"_id": oid(uid)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    u = await db.users.find_one({"_id": oid(uid)})
    uu = serialize(u)
    uu.pop("password_hash", None)
    await audit_event(
        action="update",
        entity_type="user",
        actor=user,
        entity_id=uu["id"],
        entity_name=uu["name"],
        request=request,
        metadata=updates,
    )
    return uu


@app.delete("/api/users/{uid}")
async def delete_user(uid: str, request: Request, user=Depends(admin_only)):
    existing = await db.users.find_one({"_id": oid(uid)})
    res = await db.users.delete_one({"_id": oid(uid)})
    if res.deleted_count == 0:
        raise HTTPException(404, "User not found")
    if existing:
        await audit_event(
            action="delete",
            entity_type="user",
            actor=user,
            entity_id=uid,
            entity_name=existing.get("name"),
            request=request,
            metadata={"email": existing.get("email")},
        )
    return {"message": "User deleted"}


# ─── CUSTOMERS ─────────────────────────────────────────────────────────────────
@app.get("/api/customers")
async def list_customers(
    user=Depends(get_user),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    if status:
        query["status"] = status
    if industry:
        query["industry"] = industry
    total = await db.customers.count_documents(query)
    skip = (page - 1) * limit
    docs = await db.customers.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {
        "data": serialize_list(docs),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


@app.post("/api/customers")
async def create_customer(body: CustomerIn, request: Request, user=Depends(get_user)):
    if user["role"] == "analyst":
        raise HTTPException(403, "Analysts cannot create customers")
    now = datetime.now(timezone.utc)
    doc = {**body.dict(), "owner_id": user["id"], "owner_name": user["name"], "created_at": now, "updated_at": now}
    res = await db.customers.insert_one(doc)
    doc["_id"] = res.inserted_id
    serialized = serialize(doc)
    await audit_event(
        action="create",
        entity_type="customer",
        actor=user,
        entity_id=serialized["id"],
        entity_name=serialized["name"],
        request=request,
        metadata={"company": serialized["company"], "status": serialized["status"]},
    )
    return serialized


@app.get("/api/customers/{cid}")
async def get_customer(cid: str, user=Depends(get_user)):
    c = await db.customers.find_one({"_id": oid(cid)})
    if not c:
        raise HTTPException(404, "Customer not found")
    customer = serialize(c)
    deals = await db.deals.find({"customer_id": cid}).to_list(50)
    tasks = await db.tasks.find({"customer_id": cid}).to_list(50)
    customer["deals"] = serialize_list(deals)
    customer["tasks"] = serialize_list(tasks)
    return customer


@app.put("/api/customers/{cid}")
async def update_customer(cid: str, body: CustomerUpdate, request: Request, user=Depends(get_user)):
    if user["role"] == "analyst":
        raise HTTPException(403, "Analysts cannot edit customers")
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    updates["updated_at"] = datetime.now(timezone.utc)
    res = await db.customers.update_one({"_id": oid(cid)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Customer not found")
    customer = serialize(await db.customers.find_one({"_id": oid(cid)}))
    await audit_event(
        action="update",
        entity_type="customer",
        actor=user,
        entity_id=customer["id"],
        entity_name=customer["name"],
        request=request,
        metadata=updates,
    )
    return customer


@app.delete("/api/customers/{cid}")
async def delete_customer(cid: str, request: Request, user=Depends(manager_plus)):
    existing = await db.customers.find_one({"_id": oid(cid)})
    res = await db.customers.delete_one({"_id": oid(cid)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Customer not found")
    if existing:
        await audit_event(
            action="delete",
            entity_type="customer",
            actor=user,
            entity_id=cid,
            entity_name=existing.get("name"),
            request=request,
            metadata={"company": existing.get("company")},
        )
    return {"message": "Customer deleted"}


# ─── DEALS ─────────────────────────────────────────────────────────────────────
@app.get("/api/deals")
async def list_deals(
    user=Depends(get_user),
    search: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
):
    query = {}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
        ]
    if stage:
        query["stage"] = stage
    if customer_id:
        query["customer_id"] = customer_id
    total = await db.deals.count_documents(query)
    skip = (page - 1) * limit
    docs = await db.deals.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {
        "data": serialize_list(docs),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


@app.post("/api/deals")
async def create_deal(body: DealIn, request: Request, user=Depends(get_user)):
    if user["role"] == "analyst":
        raise HTTPException(403, "Analysts cannot create deals")
    customer_name = body.customer_name
    if not customer_name:
        c = await db.customers.find_one({"_id": oid(body.customer_id)})
        customer_name = c["name"] if c else "Unknown"
    now = datetime.now(timezone.utc)
    doc = {
        **body.dict(),
        "customer_name": customer_name,
        "owner_id": user["id"],
        "owner_name": user["name"],
        "created_at": now,
        "updated_at": now,
    }
    res = await db.deals.insert_one(doc)
    doc["_id"] = res.inserted_id
    deal = serialize(doc)
    await audit_event(
        action="create",
        entity_type="deal",
        actor=user,
        entity_id=deal["id"],
        entity_name=deal["title"],
        request=request,
        metadata={"stage": deal["stage"], "value": deal["value"]},
    )
    return deal


@app.get("/api/deals/{did}")
async def get_deal(did: str, user=Depends(get_user)):
    d = await db.deals.find_one({"_id": oid(did)})
    if not d:
        raise HTTPException(404, "Deal not found")
    return serialize(d)


@app.put("/api/deals/{did}")
async def update_deal(did: str, body: DealUpdate, request: Request, user=Depends(get_user)):
    if user["role"] == "analyst":
        raise HTTPException(403, "Analysts cannot edit deals")
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    updates["updated_at"] = datetime.now(timezone.utc)
    res = await db.deals.update_one({"_id": oid(did)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Deal not found")
    deal = serialize(await db.deals.find_one({"_id": oid(did)}))
    await audit_event(
        action="update",
        entity_type="deal",
        actor=user,
        entity_id=deal["id"],
        entity_name=deal["title"],
        request=request,
        metadata=updates,
    )
    return deal


@app.delete("/api/deals/{did}")
async def delete_deal(did: str, request: Request, user=Depends(manager_plus)):
    existing = await db.deals.find_one({"_id": oid(did)})
    res = await db.deals.delete_one({"_id": oid(did)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Deal not found")
    if existing:
        await audit_event(
            action="delete",
            entity_type="deal",
            actor=user,
            entity_id=did,
            entity_name=existing.get("title"),
            request=request,
            metadata={"customer_name": existing.get("customer_name"), "value": existing.get("value")},
        )
    return {"message": "Deal deleted"}


# ─── TASKS ─────────────────────────────────────────────────────────────────────
@app.get("/api/tasks")
async def list_tasks(
    user=Depends(get_user),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = {}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if customer_id:
        query["customer_id"] = customer_id
    total = await db.tasks.count_documents(query)
    skip = (page - 1) * limit
    docs = await db.tasks.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {
        "data": serialize_list(docs),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


@app.post("/api/tasks")
async def create_task(body: TaskIn, request: Request, user=Depends(get_user)):
    now = datetime.now(timezone.utc)
    doc = {
        **body.dict(),
        "assignee_id": user["id"],
        "assignee_name": user["name"],
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now,
    }
    res = await db.tasks.insert_one(doc)
    doc["_id"] = res.inserted_id
    task = serialize(doc)
    await audit_event(
        action="create",
        entity_type="task",
        actor=user,
        entity_id=task["id"],
        entity_name=task["title"],
        request=request,
        metadata={"priority": task["priority"], "status": task["status"]},
    )
    return task


@app.get("/api/tasks/{tid}")
async def get_task(tid: str, user=Depends(get_user)):
    t = await db.tasks.find_one({"_id": oid(tid)})
    if not t:
        raise HTTPException(404, "Task not found")
    return serialize(t)


@app.put("/api/tasks/{tid}")
async def update_task(tid: str, body: TaskUpdate, request: Request, user=Depends(get_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    updates["updated_at"] = datetime.now(timezone.utc)
    res = await db.tasks.update_one({"_id": oid(tid)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Task not found")
    task = serialize(await db.tasks.find_one({"_id": oid(tid)}))
    await audit_event(
        action="update",
        entity_type="task",
        actor=user,
        entity_id=task["id"],
        entity_name=task["title"],
        request=request,
        metadata=updates,
    )
    return task


@app.delete("/api/tasks/{tid}")
async def delete_task(tid: str, request: Request, user=Depends(get_user)):
    existing = await db.tasks.find_one({"_id": oid(tid)})
    res = await db.tasks.delete_one({"_id": oid(tid)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Task not found")
    if existing:
        await audit_event(
            action="delete",
            entity_type="task",
            actor=user,
            entity_id=tid,
            entity_name=existing.get("title"),
            request=request,
            metadata={"status": existing.get("status"), "priority": existing.get("priority")},
        )
    return {"message": "Task deleted"}


# ─── DASHBOARD ─────────────────────────────────────────────────────────────────
@app.get("/api/dashboard/stats")
async def dashboard_stats(user=Depends(get_user)):
    total_customers = await db.customers.count_documents({})
    active_deals = await db.deals.count_documents({"stage": {"$nin": ["closed_won", "closed_lost"]}})
    won = await db.deals.count_documents({"stage": "closed_won"})
    lost = await db.deals.count_documents({"stage": "closed_lost"})
    total_closed = won + lost

    rev_agg = await db.deals.aggregate([
        {"$match": {"stage": "closed_won"}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(1)
    total_revenue = rev_agg[0]["total"] if rev_agg else 0

    pipe_agg = await db.deals.aggregate([
        {"$match": {"stage": {"$nin": ["closed_won", "closed_lost"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(1)
    pipeline_value = pipe_agg[0]["total"] if pipe_agg else 0

    # MoM revenue growth
    now = datetime.now(timezone.utc)
    cur_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    prev_m = now.month - 1
    prev_y = now.year
    if prev_m == 0:
        prev_m = 12
        prev_y -= 1
    prev_month = datetime(prev_y, prev_m, 1, tzinfo=timezone.utc)

    cur_rev_agg = await db.deals.aggregate([
        {"$match": {"stage": "closed_won", "updated_at": {"$gte": cur_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(1)
    prev_rev_agg = await db.deals.aggregate([
        {"$match": {"stage": "closed_won", "updated_at": {"$gte": prev_month, "$lt": cur_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(1)
    cur_rev = cur_rev_agg[0]["total"] if cur_rev_agg else 0
    prev_rev = prev_rev_agg[0]["total"] if prev_rev_agg else 0
    mom_growth = round(((cur_rev - prev_rev) / prev_rev * 100) if prev_rev > 0 else 0, 1)

    return {
        "total_customers": total_customers,
        "active_deals": active_deals,
        "total_revenue": total_revenue,
        "pipeline_value": pipeline_value,
        "win_rate": round((won / total_closed * 100) if total_closed > 0 else 0, 1),
        "pending_tasks": await db.tasks.count_documents({"status": {"$nin": ["done"]}}),
        "won_deals": won,
        "mom_growth": mom_growth,
    }


@app.get("/api/dashboard/revenue")
async def dashboard_revenue(user=Depends(get_user)):
    now = datetime.now(timezone.utc)
    result = []
    for i in range(11, -1, -1):
        total_m = now.year * 12 + (now.month - 1)
        t = total_m - i
        y, m = t // 12, (t % 12) + 1
        ms = datetime(y, m, 1, tzinfo=timezone.utc)
        me = datetime(y + 1, 1, 1, tzinfo=timezone.utc) if m == 12 else datetime(y, m + 1, 1, tzinfo=timezone.utc)
        agg = await db.deals.aggregate([
            {"$match": {"stage": "closed_won", "updated_at": {"$gte": ms, "$lt": me}}},
            {"$group": {"_id": None, "total": {"$sum": "$value"}}}
        ]).to_list(1)
        result.append({
            "month": ms.strftime("%b %Y"),
            "short": ms.strftime("%b"),
            "revenue": agg[0]["total"] if agg else 0,
        })
    return result


@app.get("/api/dashboard/pipeline")
async def dashboard_pipeline(user=Depends(get_user)):
    stages = [
        ("lead", "Lead"), ("qualified", "Qualified"), ("proposal", "Proposal"),
        ("negotiation", "Negotiation"), ("closed_won", "Won"), ("closed_lost", "Lost"),
    ]
    result = []
    for stage, label in stages:
        count = await db.deals.count_documents({"stage": stage})
        val_agg = await db.deals.aggregate([
            {"$match": {"stage": stage}},
            {"$group": {"_id": None, "total": {"$sum": "$value"}}}
        ]).to_list(1)
        result.append({"stage": stage, "label": label, "count": count, "value": val_agg[0]["total"] if val_agg else 0})
    return result


@app.get("/api/dashboard/recent-deals")
async def recent_deals(user=Depends(get_user)):
    docs = await db.deals.find({"stage": {"$nin": ["closed_lost"]}}).sort("updated_at", -1).limit(6).to_list(6)
    return serialize_list(docs)


@app.get("/api/dashboard/activity")
async def recent_activity(user=Depends(get_user)):
    docs = await db.tasks.find().sort("updated_at", -1).limit(6).to_list(6)
    return serialize_list(docs)


# ─── SEEDING ───────────────────────────────────────────────────────────────────
async def setup_db():
    await db.users.create_index("email", unique=True)
    await db.audit_logs.create_index("created_at")

    users_seed = [
        {"email": ADMIN_EMAIL, "name": "Adam Pierce", "role": "admin", "department": "Executive", "pwd": ADMIN_PWD},
        {"email": MANAGER_EMAIL, "name": "Sarah Chen", "role": "manager", "department": "Sales", "pwd": MANAGER_PWD},
        {"email": ANALYST_EMAIL, "name": "Marcus Johnson", "role": "analyst", "department": "Operations", "pwd": ANALYST_PWD},
    ]
    user_ids = {}
    for u in users_seed:
        ex = await db.users.find_one({"email": u["email"]})
        if not ex:
            doc = {
                "email": u["email"], "name": u["name"], "role": u["role"],
                "department": u["department"], "password_hash": hash_pw(u["pwd"]),
                "is_active": True, "created_at": datetime.now(timezone.utc), "last_login": None,
            }
            r = await db.users.insert_one(doc)
            user_ids[u["role"]] = str(r.inserted_id)
        else:
            user_ids[u["role"]] = str(ex["_id"])
            if not verify_pw(u["pwd"], ex["password_hash"]):
                await db.users.update_one({"_id": ex["_id"]}, {"$set": {"password_hash": hash_pw(u["pwd"])}})

    if await db.customers.count_documents({}) == 0:
        cust_seed = [
            {"name": "Emily Carter", "email": "emily@techvision.io", "phone": "+1 (555) 201-4892", "company": "TechVision Inc.", "industry": "Technology", "status": "customer", "value": 48500, "source": "Referral", "tags": ["enterprise", "saas"]},
            {"name": "James Harrington", "email": "jharrington@novapulse.com", "phone": "+1 (555) 338-7741", "company": "NovaPulse", "industry": "Healthcare", "status": "customer", "value": 62000, "source": "Conference", "tags": ["healthcare", "large"]},
            {"name": "Sophia Nakamura", "email": "sophia@orbitmedia.co", "phone": "+1 (555) 447-9023", "company": "Orbit Media Co.", "industry": "Marketing", "status": "prospect", "value": 18000, "source": "Website", "tags": ["sme", "marketing"]},
            {"name": "David Reyes", "email": "d.reyes@bridgecapital.com", "phone": "+1 (555) 512-3456", "company": "Bridge Capital", "industry": "Finance", "status": "customer", "value": 120000, "source": "Cold Outreach", "tags": ["finance", "enterprise"]},
            {"name": "Clara Mendes", "email": "clara@greenleaf.biz", "phone": "+1 (555) 623-8812", "company": "Greenleaf Solutions", "industry": "Sustainability", "status": "lead", "value": 9500, "source": "LinkedIn", "tags": ["startup"]},
            {"name": "Nathan Brooks", "email": "nbrooks@vexustech.com", "phone": "+1 (555) 789-3340", "company": "Vexus Technologies", "industry": "Technology", "status": "customer", "value": 55000, "source": "Partner", "tags": ["tech", "mid-market"]},
            {"name": "Olivia Patel", "email": "o.patel@nexalabs.ai", "phone": "+1 (555) 901-2234", "company": "Nexa Labs AI", "industry": "Artificial Intelligence", "status": "prospect", "value": 75000, "source": "Conference", "tags": ["ai", "enterprise"]},
            {"name": "Marcus Flynn", "email": "mflynn@ironforge.io", "phone": "+1 (555) 667-4521", "company": "IronForge Manufacturing", "industry": "Manufacturing", "status": "churned", "value": 30000, "source": "Referral", "tags": ["manufacturing"]},
            {"name": "Isabelle Dubois", "email": "idubois@stratosphere.fr", "phone": "+33 1 40 20 50 10", "company": "Stratosphere SA", "industry": "Consulting", "status": "customer", "value": 42000, "source": "Website", "tags": ["consulting", "europe"]},
            {"name": "Ryan Kwon", "email": "ryan@luminahealth.com", "phone": "+1 (555) 234-5678", "company": "Lumina Health", "industry": "Healthcare", "status": "prospect", "value": 33000, "source": "Webinar", "tags": ["healthcare", "sme"]},
            {"name": "Amara Osei", "email": "aosei@solargrid.io", "phone": "+1 (555) 345-6789", "company": "SolarGrid Energy", "industry": "Energy", "status": "lead", "value": 88000, "source": "Trade Show", "tags": ["energy", "large"]},
            {"name": "Lucas Ferreira", "email": "lferreira@codeblast.dev", "phone": "+55 11 3456-7890", "company": "CodeBlast Dev", "industry": "Technology", "status": "customer", "value": 14000, "source": "Cold Outreach", "tags": ["startup", "dev-tools"]},
        ]
        now = datetime.now(timezone.utc)
        cids = []
        for i, c in enumerate(cust_seed):
            off = (i * 23) % 310
            created = now - timedelta(days=off + 10)
            doc = {**c, "notes": f"Key account at {c['company']}.", "owner_id": user_ids.get("manager", ""), "owner_name": "Sarah Chen", "created_at": created, "updated_at": created}
            r = await db.customers.insert_one(doc)
            cids.append({"id": str(r.inserted_id), "name": c["name"], "company": c["company"]})
    else:
        custs = await db.customers.find({}).to_list(100)
        cids = [{"id": str(c["_id"]), "name": c["name"], "company": c["company"]} for c in custs]

    if await db.deals.count_documents({}) == 0 and cids:
        now = datetime.now(timezone.utc)
        # Historical revenue deals (closed_won) for the last 12 months chart
        monthly_rev = [42000, 38500, 55200, 48100, 61800, 57400, 72300, 65900, 81200, 74500, 88000, 92400]
        for i, rev in enumerate(monthly_rev):
            total_m = now.year * 12 + (now.month - 1)
            t = total_m - (11 - i)
            y, m = t // 12, (t % 12) + 1
            deal_date = datetime(y, m, 15, tzinfo=timezone.utc)
            cust = cids[i % len(cids)]
            await db.deals.insert_one({
                "title": f"Revenue Deal — {cust['company']}",
                "customer_id": cust["id"], "customer_name": cust["name"],
                "stage": "closed_won", "value": rev, "probability": 100,
                "expected_close_date": deal_date.strftime("%Y-%m-%d"),
                "notes": "Closed and won.", "owner_id": user_ids.get("manager", ""),
                "owner_name": "Sarah Chen", "created_at": deal_date, "updated_at": deal_date,
            })

        # Active pipeline deals
        pipeline_deals = [
            ("Enterprise License — TechVision", 0, "lead", 10, 4800),
            ("Platform Upgrade — NovaPulse", 1, "lead", 15, 12500),
            ("Annual Subscription — Orbit Media", 2, "qualified", 30, 22000),
            ("Data Analytics Module — Bridge Capital", 3, "qualified", 35, 35000),
            ("Security Suite — Vexus Tech", 5, "proposal", 55, 18000),
            ("API Integration — Nexa Labs", 6, "proposal", 60, 45000),
            ("Cloud Migration — Stratosphere SA", 8, "negotiation", 75, 68000),
            ("Compliance Module — Lumina Health", 9, "closed_lost", 0, 28000),
        ]
        for title, ci, stage, prob, val in pipeline_deals:
            cust = cids[ci % len(cids)]
            days_ago = random.randint(5, 90)
            created = now - timedelta(days=days_ago)
            close = (now + timedelta(days=random.randint(15, 90))).strftime("%Y-%m-%d")
            await db.deals.insert_one({
                "title": title, "customer_id": cust["id"], "customer_name": cust["name"],
                "stage": stage, "value": val, "probability": prob,
                "expected_close_date": close, "notes": f"Deal for {cust['company']}.",
                "owner_id": user_ids.get("manager", ""), "owner_name": "Sarah Chen",
                "created_at": created, "updated_at": created,
            })

    if await db.tasks.count_documents({}) == 0 and cids:
        now = datetime.now(timezone.utc)
        tasks_seed = [
            ("Follow up with TechVision on renewal", "high", "todo", 0),
            ("Prepare proposal for Nexa Labs AI", "urgent", "in_progress", 6),
            ("Send contract to Bridge Capital", "medium", "done", 3),
            ("Schedule demo for Orbit Media Co.", "medium", "todo", 2),
            ("Review Lumina Health legal documents", "high", "in_progress", 9),
            ("Update CRM records for Q2", "low", "todo", 4),
            ("Onboarding call with CodeBlast Dev", "medium", "done", 11),
            ("Quarterly review preparation", "high", "in_progress", 1),
            ("Follow up with SolarGrid Energy", "medium", "todo", 10),
            ("Draft proposal for Stratosphere SA", "medium", "done", 8),
            ("Check in with IronForge re: re-engagement", "low", "todo", 7),
            ("Process renewal — Vexus Technologies", "high", "in_progress", 5),
        ]
        for title, priority, status, ci in tasks_seed:
            cust = cids[ci % len(cids)]
            due = (now + timedelta(days=random.randint(-3, 14))).strftime("%Y-%m-%d")
            created = now - timedelta(days=random.randint(1, 30))
            await db.tasks.insert_one({
                "title": title, "description": f"Action required for {cust['name']} at {cust['company']}.",
                "customer_id": cust["id"], "deal_id": None,
                "priority": priority, "status": status, "due_date": due,
                "assignee_id": user_ids.get("analyst", ""), "assignee_name": "Marcus Johnson",
                "created_by": user_ids.get("manager", ""),
                "created_at": created, "updated_at": created,
            })

    # Best-effort local developer aid; skip silently on read-only hosts like Vercel.
    try:
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        with (MEMORY_DIR / "test_credentials.md").open("w", encoding="utf-8") as f:
            f.write(f"""# NexCRM Test Credentials

## Admin User
- Email: {ADMIN_EMAIL}
- Password: {ADMIN_PWD}
- Role: admin
- Access: Full system access including User Management

## Manager User
- Email: {MANAGER_EMAIL}
- Password: {MANAGER_PWD}
- Role: manager
- Access: Customers, Deals, Tasks, Reports (no User Management)

## Analyst User
- Email: {ANALYST_EMAIL}
- Password: {ANALYST_PWD}
- Role: analyst
- Access: Read-only on customers/deals, can create/edit tasks

## API Endpoints
- Base: /api
- POST /api/auth/login
- GET  /api/auth/me
- GET  /api/customers
- GET  /api/deals
- GET  /api/tasks
- GET  /api/users (admin only)
- GET  /api/dashboard/stats
- GET  /api/dashboard/revenue
- GET  /api/dashboard/pipeline
""")
    except OSError:
        pass
