

---

## 🧠 Model Registry

A full-stack **Model Registry Management System** that allows users to upload, manage, and monitor machine learning models with activity tracking, environment tagging, and secure authentication.

---

### 📁 Project Structure

```
model_registry/
├── backend/              # Express.js + PostgreSQL API
│   ├── src/
│   │   ├── controllers/  # Controllers for handling routes
│   │   ├── routes/       # Express routers
│   │   ├── services/     # DB and business logic
│   │   ├── db/           # PostgreSQL connection pool
│   │   └── server.js     # Entry point
│   ├── package.json
│   └── .env
│
├── frontend/             # Next.js + Tailwind CSS client
│   ├── app/
│   │   ├── login/
│   │   ├── register/
│   │   ├── dashboard/
│   │   └── models/
│   ├── components/
│   ├── package.json
│   └── tailwind.config.js
│
├── .gitignore
└── README.md
```

---

### 🚀 Features

#### 🖥️ Frontend (Next.js + Tailwind)
- Clean, responsive UI with Tailwind CSS  
- Secure authentication (JWT stored in `localStorage`)  
- Model list with filtering, search, and sorting  
- Upload new models with environment tagging (Production/Staging/Test)  
- View model activity logs

#### ⚙️ Backend (Express.js + PostgreSQL)
- REST API architecture  
- User registration and login with hashed passwords  
- JWT-based authentication middleware  
- CRUD endpoints for models  
- Activity log tracking (up to recent 100 actions)  
- PostgreSQL using `pg` library with connection pooling  

---

### 🔧 Setup Instructions

#### 1️⃣ Clone the repository
```bash
git clone https://github.com/N-e-0-24/model_registry.git
cd model_registry
```

---

#### 2️⃣ Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:
```
PORT=3001
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
DB_NAME=model_registry
JWT_SECRET=your_super_secret_key
```

Start the backend:
```bash
npm run dev
```

---

#### 3️⃣ Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

Now the frontend will run on [http://localhost:3000](http://localhost:3000)

---

### 🔐 Authentication Flow

1. **Register:**  
   Send a `POST` request to `/api/auth/register` with full name, email, and password.  
   Returns a JWT token.

2. **Login:**  
   Send a `POST` request to `/api/auth/login` with email and password.  
   Returns a JWT token stored in `localStorage`.

3. **Protected Routes:**  
   Access `/dashboard` or `/models` using the stored token in the request header.

---

### 🧾 API Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user |
| `GET` | `/api/models` | Get all models |
| `POST` | `/api/models/upload` | Upload a new model |
| `GET` | `/api/models/:id/logs` | Fetch model activity logs |
| `DELETE` | `/api/models/:id` | Delete a model |

---

### 🧑‍💻 Tech Stack

**Frontend**
- Next.js 14 (App Router)
- Tailwind CSS
- Axios

**Backend**
- Node.js / Express.js
- PostgreSQL (`pg` package)
- JWT Authentication
- Bcrypt for password hashing

---

### 🧩 Environment Tagging

Each model can be associated with an environment tag:
- 🟢 **Production**
- 🟡 **Staging**
- 🔵 **Test**

Filtering and searching supported in the dashboard.

---

### 🪵 Activity Logs

Each model has an associated log history stored in PostgreSQL:
- Action type (upload/update/delete)
- Timestamp
- User ID

Only the **100 most recent** logs are returned per model for better performance.

---

### 🧰 Commands

#### Backend
```bash
npm run dev     # Start server in dev mode
npm start       # Start server in prod mode
```

#### Frontend
```bash
npm run dev     # Run Next.js development server
npm run build   # Build for production
npm start       # Run production build
```

---

### 📦 Deployment Notes
- Use Docker for both frontend and backend if desired.  
- Backend should run on port `3001`, frontend on port `3000`.  
- Configure CORS properly when deploying.

---

### 👤 Author

**Ayush Singh**  
Associate Software Engineer @ Accenture  
Backend Developer | Full-Stack Enthusiast  
🔗 [GitHub](https://github.com/N-e-0-24)

---

