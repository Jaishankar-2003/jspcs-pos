# JSPCS POS - Quick Reference Guide

## 🚀 Access Your Application

```
🌐 Frontend:    http://localhost:5174
📡 Backend:     http://localhost:8081/api/v1
🗄️  Database:    localhost:5433 (postgres/password)
```

---

## 👤 Login Credentials

```
Username: admin    or    cashier
Password: (check backend logs or DataSeeder.java)
```

---

## 🛑 Stop Services

```bash
# In backend terminal: Press Ctrl+C
# In frontend terminal: Press Ctrl+C
# Stop database:
docker stop jspcs-pos-db
```

---

## ▶️ Restart Services

```bash
# Start database
docker start jspcs-pos-db

# Backend (Terminal 1)
cd /home/sri-jaya-shankaran/jspcs-pos
mvn spring-boot:run

# Frontend (Terminal 2)
cd /home/sri-jaya-shankaran/jspcs-pos/frontend
npm run dev
```

---

## 🔍 Check Status

```bash
# Backend running?
curl http://localhost:8081

# Frontend running?
curl http://localhost:5174

# Database running?
docker ps | grep jspcs-pos-db

# Database accessible?
docker exec jspcs-pos-db psql -U postgres -d jspcs_pos -c "SELECT COUNT(*) FROM users;"
```

---

## 📝 Important Files

| File | Purpose |
|------|---------|
| `src/main/resources/application.yml` | Backend configuration |
| `frontend/src/api/axios.ts` | API configuration |
| `src/main/java/com/jspcs/pos/config/DataSeeder.java` | Default users setup |
| `frontend/vite.config.ts` | Frontend build config |
| `pom.xml` | Maven dependencies |
| `frontend/package.json` | NPM dependencies |

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -i :8081      # Check port 8081
kill -9 <PID>      # Kill process
```

### Database Connection Failed
```bash
docker logs jspcs-pos-db
docker restart jspcs-pos-db
```

### Frontend Can't Call Backend
```bash
# Check if backend is running
curl http://localhost:8081

# Check frontend API config
cat frontend/src/api/axios.ts
```

### Build Errors
```bash
mvn clean install -DskipTests
cd frontend && npm install
```

---

## 📊 Technology Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Spring Boot 3.2.1 + Java 21 |
| **Frontend** | React 19 + TypeScript + Vite |
| **Database** | PostgreSQL 15.15 |
| **Container** | Docker + Docker Compose |
| **Build** | Maven + npm |
| **Auth** | JWT Token |

---

## 🔌 Key Endpoints

```
POST   /api/v1/auth/login
GET    /api/v1/users
GET    /api/v1/products
POST   /api/v1/sales/invoices
```

---

## 📚 Documentation

- `PROJECT_STATUS_AND_SETUP_GUIDE.md` - Complete setup guide
- `CURRENT_STATUS_REPORT.md` - Current system status
- `ARCHITECTURE.md` - System design
- `DATABASE_DESIGN.md` - Database schema
- `README.md` - Project overview

---

## ✅ Status: All Services Running ✅

**Last Verified:** January 16, 2026 14:50 IST
