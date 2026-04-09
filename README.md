# NexCRM

NexCRM is a CRM dashboard with:

- FastAPI backend in `backend`
- React frontend in `frontend`
- MongoDB for persistence

## Local run

1. Start MongoDB locally on `mongodb://localhost:27017`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Copy `frontend/.env.example` to `frontend/.env` and set `REACT_APP_BACKEND_URL=http://localhost:8000`.
4. Run the backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

5. Run the frontend:

```powershell
cd frontend
npm install
npm start
```

## Vercel deploy

Use two Vercel projects from the same GitHub repository:

1. Backend project
   Root Directory: `backend`
2. Frontend project
   Root Directory: `frontend`

### Backend env vars

Set these in the Vercel backend project:

- `MONGO_URL`
- `DB_NAME`
- `CORS_ORIGINS`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `MANAGER_EMAIL`
- `MANAGER_PASSWORD`
- `ANALYST_EMAIL`
- `ANALYST_PASSWORD`

For MongoDB Atlas, use the connection string from Atlas. `dnspython` is included so `mongodb+srv://...` works.

### Frontend env vars

Set this in the Vercel frontend project:

- `REACT_APP_BACKEND_URL`
  Value example: `https://your-backend.vercel.app`

### Order

1. Create MongoDB Atlas cluster and user.
2. Deploy backend on Vercel with root `backend`.
3. Copy the backend deployment URL.
4. Deploy frontend on Vercel with root `frontend`.
5. Set `REACT_APP_BACKEND_URL` to the backend URL and redeploy frontend.

### Demo users

The backend seeds these users automatically on first startup:

- `admin@nexcrm.io`
- `sarah.chen@nexcrm.io`
- `marcus.johnson@nexcrm.io`

Passwords come from the backend environment variables.
