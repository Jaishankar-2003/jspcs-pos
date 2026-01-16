# JSPCS POS System - Project Status & Setup Guide

**Last Updated:** January 16, 2026  
**Project Status:** 🟡 **PARTIALLY RUNNING** (Database & Backend Working, Frontend Needs Restart)

---

## 📋 Current System Status

### ✅ Working Components

| Component | Status | Port | Details |
|-----------|--------|------|---------|
| **PostgreSQL Database** | ✅ Running | 5433 | Docker container `jspcs-pos-db` active |
| **Spring Boot Backend** | ❌ Not Running | 8081 | Needs to be started |
| **Frontend (React)** | ❌ Not Running | 5174 | Needs to be started |
| **Build System** | ✅ Ready | - | Maven 3.8+ installed |

### 📊 Recent Fixes Applied
- ✅ Fixed PostgreSQL SCRAM authentication errors
- ✅ Fixed MapStruct mapper bugs (ProductMapper & UserMapper)
- ✅ Added missing `costPrice` field to ProductResponse DTO
- ✅ Database migrations applied successfully
- ✅ Default users created (admin, admin2, cashier)

---

## 🚀 How to Run the Project

### Prerequisites
```bash
# Verify Java version (should be 17+)
java -version

# Verify Maven is installed
mvn -version

# Verify Node.js is installed
node --version
npm --version

# Verify Docker is available
docker --version
```

### Step 1: Ensure Database is Running

```bash
# Check if PostgreSQL container is running
docker ps | grep jspcs-pos-db

# If not running, start it
docker start jspcs-pos-db

# If container doesn't exist, create it
docker run -d \
  --name jspcs-pos-db \
  -e POSTGRES_DB=jspcs_pos \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5433:5432 \
  postgres:15-alpine

# Wait 5 seconds for database to be ready
sleep 5
```

### Step 2: Start the Backend (Spring Boot)

**Option A: Run in Background (Recommended)**
```bash
cd /home/sri-jaya-shankaran/jspcs-pos

# Build the project (if not already built)
mvn clean install -DskipTests

# Run the backend
mvn spring-boot:run &
```

**Option B: Run in Foreground (for debugging)**
```bash
cd /home/sri-jaya-shankaran/jspcs-pos
mvn spring-boot:run
```

**Expected Output:**
```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.1)

2026-01-16T14:27:20.819+05:30  INFO ... PosApplication : Started PosApplication in 7.91 seconds
2026-01-16T14:27:20.806+05:30  INFO ... TomcatWebServer : Tomcat started on port 8081 (http)
```

**Verify Backend is Running:**
```bash
curl http://localhost:8081/api/v1/health
# Should return a response (or 401 if auth required)
```

### Step 3: Start the Frontend (React + Vite)

**In a New Terminal:**
```bash
cd /home/sri-jaya-shankaran/jspcs-pos/frontend

# Install dependencies (usually already done)
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
> frontend@0.0.0 dev
> vite

  VITE v7.3.1  ready in 331 ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: use --host to expose
```

---

## 🔑 Default Credentials

After the backend starts, three default users are created:

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| `admin` | (set during first login) | Admin | Full system access |
| `admin2` | (set during first login) | Admin | Full system access |
| `cashier` | (set during first login) | Cashier | POS operations |

> **Note:** Check the `DataSeeder` class in `src/main/java/com/jspcs/pos/config/DataSeeder.java` for actual password configuration.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────┐
│           JSPCS POS System Architecture         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Frontend (React + TypeScript)                 │
│  - URL: http://localhost:5174                  │
│  - Port: 5174 (or 5173 if available)           │
│  - Framework: Vite, React 19                   │
│  - State: Redux Toolkit                        │
│                                                 │
│              ↓ API Calls (HTTP/REST) ↓         │
│                                                 │
│  Backend (Spring Boot 3.2.1)                   │
│  - URL: http://localhost:8081                  │
│  - Port: 8081                                  │
│  - Java: 21.0.2 (LTS)                          │
│  - Database: PostgreSQL 15                     │
│  - Auth: JWT Tokens                            │
│  - API Docs: Swagger UI (if enabled)           │
│                                                 │
│              ↓ SQL Queries ↓                   │
│                                                 │
│  Database (PostgreSQL 15.15)                   │
│  - Host: localhost:5433                        │
│  - Database: jspcs_pos                         │
│  - User: postgres                              │
│  - Password: password                          │
│  - Migration Tool: Flyway                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Issue: Backend Fails to Start

**Error: "Port 8081 already in use"**
```bash
# Find process using port 8081
lsof -i :8081
# or
ss -tlnp | grep 8081

# Kill the process
kill -9 <PID>

# Or change port in src/main/resources/application.yml
# spring.server.port: 8082
```

### Issue: Database Connection Refused

**Error: "Connection to localhost:5433 refused"**
```bash
# Check if Docker container is running
docker ps | grep jspcs-pos-db

# View container logs
docker logs jspcs-pos-db

# Restart container
docker restart jspcs-pos-db
```

### Issue: Frontend Can't Connect to Backend

**Error: "Cannot GET /api/v1/..."**
```bash
# 1. Verify backend is running
curl http://localhost:8081/

# 2. Check frontend API configuration
cat src/api/axios.ts
# baseURL should be: /api/v1

# 3. Ensure CORS is enabled in backend
# Check SecurityConfig.java for CORS configuration
```

### Issue: Authentication Fails (SCRAM Error)

**Error: "FATAL: password authentication failed"**
```bash
# This was a previous issue - now fixed by:
# 1. Removing username/password from JDBC URL
# 2. Using Spring DataSource configuration

# If you still see this:
docker stop jspcs-pos-db
docker rm jspcs-pos-db

# Recreate with correct credentials
docker run -d \
  --name jspcs-pos-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=jspcs_pos \
  -e POSTGRES_USER=postgres \
  -p 5433:5432 \
  postgres:15-alpine
```

---

## 📁 Project Structure

```
/home/sri-jaya-shankaran/jspcs-pos/
├── src/
│   ├── main/
│   │   ├── java/com/jspcs/pos/
│   │   │   ├── controller/         # REST endpoints
│   │   │   ├── service/            # Business logic
│   │   │   ├── repository/         # Database access
│   │   │   ├── entity/             # JPA entities
│   │   │   ├── dto/                # Data Transfer Objects
│   │   │   │   ├── request/        # Input DTOs
│   │   │   │   └── response/       # Output DTOs
│   │   │   ├── mapper/             # MapStruct mappers
│   │   │   ├── security/           # JWT & Authentication
│   │   │   └── config/             # Spring configurations
│   │   └── resources/
│   │       ├── application.yml     # App config
│   │       └── db/migration/       # Flyway migrations
│   └── test/java/...               # Unit tests
│
├── frontend/
│   ├── src/
│   │   ├── api/                    # API calls
│   │   ├── components/             # React components
│   │   ├── features/               # Feature modules
│   │   ├── store/                  # Redux store
│   │   ├── types/                  # TypeScript types
│   │   └── main.tsx               # Entry point
│   ├── package.json                # Dependencies
│   ├── vite.config.ts              # Vite config
│   └── tsconfig.json               # TypeScript config
│
├── pom.xml                         # Maven configuration
├── docker-compose.yml              # Docker services
└── README.md                       # Project documentation
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/v1/auth/login           # Login with username/password
POST   /api/v1/auth/logout          # Logout user
GET    /api/v1/auth/me              # Get current user info
POST   /api/v1/auth/refresh         # Refresh JWT token
```

### Users
```
GET    /api/v1/users                # List all users (admin only)
GET    /api/v1/users/{id}           # Get user by ID
POST   /api/v1/users                # Create new user (admin only)
PUT    /api/v1/users/{id}           # Update user (admin only)
DELETE /api/v1/users/{id}           # Delete user (admin only)
```

### Products
```
GET    /api/v1/products             # List all products
GET    /api/v1/products/{id}        # Get product by ID
POST   /api/v1/products             # Create new product (admin only)
PUT    /api/v1/products/{id}        # Update product (admin only)
DELETE /api/v1/products/{id}        # Delete product (admin only)
```

### Sales/Invoices
```
GET    /api/v1/sales/invoices       # List invoices
GET    /api/v1/sales/invoices/{id}  # Get invoice details
POST   /api/v1/sales/invoices       # Create new invoice (cashier)
PUT    /api/v1/sales/invoices/{id}  # Update invoice
```

---

## 📦 Technology Stack

### Backend
- **Framework:** Spring Boot 3.2.1
- **Java Version:** 17+ (Currently using 21.0.2)
- **Build Tool:** Maven 3.8+
- **Database:** PostgreSQL 15.15
- **Database Migration:** Flyway 9.22.3
- **ORM:** Hibernate 6.4.1 (JPA)
- **API Docs:** Swagger UI / SpringDoc OpenAPI
- **Security:** JWT Authentication, Spring Security
- **Mapping:** MapStruct 1.5.5

### Frontend
- **Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite 7.3.1
- **State Management:** Redux Toolkit
- **HTTP Client:** Axios
- **Styling:** Tailwind CSS
- **Node Version:** 18+ (or 20+)

### DevOps
- **Container:** Docker
- **Container Orchestration:** Docker Compose
- **CI/CD:** GitHub Actions (optional)

---

## ✨ Features Implemented

### ✅ Core Features
- [x] User authentication with JWT tokens
- [x] Role-based access control (Admin, Cashier)
- [x] Product management (CRUD)
- [x] Inventory tracking
- [x] Sales invoicing
- [x] Cashier counter management
- [x] GST/Tax calculation

### 🟡 In Progress / Needs Testing
- [ ] Billing engine optimization
- [ ] Websocket real-time updates
- [ ] Advanced reporting
- [ ] Hardware integration (POS devices)
- [ ] Backup & security features

---

## 🧪 Testing

### Run Unit Tests
```bash
cd /home/sri-jaya-shankaran/jspcs-pos

# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=UserServiceTest

# Skip tests during build
mvn clean install -DskipTests
```

### Frontend Tests
```bash
cd frontend

# Run frontend tests
npm run test

# Generate coverage report
npm run test:coverage
```

---

## 🔐 Security Notes

### Current Implementation
- JWT tokens with configurable expiration
- Password hashing (BCrypt)
- CORS enabled for frontend origin
- SQL injection prevention (using JPA parameterized queries)
- CSRF protection (if enabled)

### Recommendations for Production
1. Use environment variables for sensitive config
2. Enable HTTPS/TLS
3. Implement rate limiting
4. Add comprehensive logging & monitoring
5. Regular security audits
6. Keep dependencies updated

---

## 📝 Common Commands

```bash
# Backend Commands
cd /home/sri-jaya-shankaran/jspcs-pos

# Clean and rebuild
mvn clean install -DskipTests

# Compile only
mvn clean compile

# Run application
mvn spring-boot:run

# Check for dependency updates
mvn versions:display-dependency-updates

# Frontend Commands
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Docker Commands
# List running containers
docker ps

# View container logs
docker logs jspcs-pos-db

# Stop all containers
docker-compose down

# Start all containers
docker-compose up -d
```

---

## 📞 Support & Issues

### If Backend Won't Start
1. Check Java version: `java -version`
2. Check Maven: `mvn -version`
3. Verify PostgreSQL is running
4. Check port 8081 is not in use
5. Review logs in terminal

### If Frontend Won't Connect to Backend
1. Verify backend is running on port 8081
2. Check CORS configuration
3. Verify API base URL in `src/api/axios.ts`
4. Check browser console for errors (F12)

### If Database Connection Fails
1. Verify Docker container is running
2. Check PostgreSQL logs: `docker logs jspcs-pos-db`
3. Verify credentials in `application.yml`
4. Ensure port 5433 is not blocked

---

## 📚 Documentation Files

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) - Database schema design
- [AUTHENTICATION_DESIGN.md](./AUTHENTICATION_DESIGN.md) - JWT & security design
- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - Frontend structure
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - API integration guide

---

## 🎯 Next Steps

1. **Start the Backend:**
   ```bash
   cd /home/sri-jaya-shankaran/jspcs-pos && mvn spring-boot:run &
   ```

2. **Start the Frontend:**
   ```bash
   cd /home/sri-jaya-shankaran/jspcs-pos/frontend && npm run dev
   ```

3. **Access the Application:**
   - Frontend: http://localhost:5174
   - Backend API: http://localhost:8081/api/v1
   - Database: localhost:5433

4. **Login with Default Credentials:**
   - Username: `admin` or `cashier`
   - Password: Check application logs or DataSeeder class

---

**Generated:** January 16, 2026  
**Version:** 1.0  
**Author:** Development Team

Username: admin (or cashier)
Check DataSeeder.java for passwords