# POS System Integration Guide

This guide explains how to run and test the integrated POS system.

## Prerequisites
- **Java**: JDK 17 or 21
- **Maven**: 3.8+
- **PostgreSQL**: 15+ (Running locally)
- **Node.js**: 18+
- **npm**: 9+

## Database Setup
1. Create a database named `jspcs_pos` in PostgreSQL.
2. Update `src/main/resources/application.yml` with your PostgreSQL credentials (username and password).
3. The system uses Flyway for migrations; tables will be created automatically on startup.

## How to Run
### Backend (Spring Boot)
```bash
./mvnw spring-boot:run
```
The backend will be available at `http://localhost:8081`.

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Authentication & Roles
Default credentials (provided via migration):
- **Admin**: `admin` / `admin123`
- **Cashier**: `cashier` / `cashier123`

### Role-Based Access
- **Admin**: Access to Products, Inventory, Users, and Reports.
- **Cashier**: Access to Billing and Invoice history.

## API Documentation (Swagger)
The API is documented using Swagger UI.
- **URL**: [http://localhost:8081/swagger-ui/index.html](http://localhost:8081/swagger-ui/index.html)
- **How to Test**:
  1. Go to the Auth -> `/login` endpoint.
  2. Click "Try it out" and enter credentials.
  3. Execute and copy the `token` from the response.
  4. Click the "Authorize" button at the top of the page.
  5. Paste the token in the "Value" field and click "Authorize".
  6. You can now call protected endpoints.

## Frontend Integration Notes
- **API Base URL**: Configured in `frontend/src/api/axios.ts` as `/api/v1`.
- **Token Handling**: Tokens are automatically stored in `localStorage` and sent in the `Authorization` header for all requests.
- **Mock Data**: To replace mock data in any component, import the corresponding service from `src/api` and use it within a `useEffect` or state management action.

### Example API Contract (Product)
```json
{
  "id": "uuid",
  "sku": "PROD-001",
  "name": "Sample Product",
  "sellingPrice": 99.99,
  "currentStock": 50,
  "availableStock": 50
}
```

## Troubleshooting
- **Database Connection**: Ensure PostgreSQL is running and the database `jspcs_pos` exists.
- **Port Conflicts**: Backend uses `8081`, Frontend uses `5173`. Ensure these ports are free.
- **Auth Errors**: If you get a 401 error, try logging out and logging back in to clear the token.
