# Architecture Summary
## JSPCS POS - Spring Boot Project Structure

---

## Quick Reference

### Package Root
```
com.jspcs.pos
```

### Main Packages
1. **config/** - Configuration classes
2. **controller/** - REST API endpoints
3. **service/** - Business logic (interfaces + implementations)
4. **repository/** - Data access (JPA repositories)
5. **entity/** - JPA entities (database mapping)
6. **dto/** - Data Transfer Objects (request/response/internal)
7. **mapper/** - Entity-DTO mappers (MapStruct)
8. **exception/** - Custom exceptions and handlers
9. **security/** - Spring Security configuration
10. **websocket/** - WebSocket handlers and configuration
11. **util/** - Utility classes
12. **validation/** - Custom validators

---

## Layer Architecture

```
┌─────────────────────────────────────┐
│         Controller                  │  HTTP, Validation, DTO Mapping
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│         Service                     │  Business Logic, Transactions
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│         Repository                  │  Data Access, Queries
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│         Entity                      │  Database Mapping
└─────────────────────────────────────┘
```

---

## DTO vs Entity Strategy

### Entities (JPA)
- ✅ Map database tables
- ✅ Include relationships
- ✅ Include validation annotations
- ✅ Managed by JPA/Hibernate
- ❌ NOT exposed to API layer

### DTOs
- ✅ API contracts (request/response)
- ✅ Flat structure (minimal nesting)
- ✅ Include validation annotations
- ✅ Include serialization annotations
- ✅ Separate Create/Update DTOs

### Mapping
- **Technology**: MapStruct (compile-time generation)
- **Pattern**: Interface-based mapping
- **Location**: `mapper/` package
- **Naming**: `{Entity}Mapper.java`

---

## Exception Handling

### Exception Hierarchy
```
BusinessException (base)
├── EntityNotFoundException (404)
├── ValidationException (400)
├── ConcurrencyException (409)
├── InsufficientStockException (422)
├── PaymentException (400)
└── AuthenticationException (401)
```

### Global Handler
- **Class**: `GlobalExceptionHandler.java`
- **Annotation**: `@RestControllerAdvice`
- **Location**: `exception/handler/`
- **Responsibilities**: Catch exceptions, map to HTTP status, format error responses

### Error Response Format
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Resource not found",
  "errorCode": "ENTITY_NOT_FOUND",
  "path": "/api/products/123"
}
```

---

## Transaction Management

### Strategy
- **Location**: Service layer only
- **Annotation**: `@Transactional` on service methods
- **Default Propagation**: `REQUIRED`
- **Default Isolation**: `READ_COMMITTED`

### Transaction Types

#### Read-Write Transactions
```java
@Transactional
public ProductResponse createProduct(CreateProductRequest request) {
    // Business logic
}
```

#### Read-Only Transactions
```java
@Transactional(readOnly = true)
public List<ProductResponse> getAllProducts() {
    // Query operations
}
```

#### High Isolation Transactions
```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public InvoiceResponse createInvoice(CreateInvoiceRequest request) {
    // Critical financial operations
}
```

### Best Practices
- ✅ Keep transactions short (< 1 second)
- ✅ Use read-only for queries
- ✅ Use appropriate isolation levels
- ✅ Handle optimistic locking conflicts
- ❌ Don't use transactions in controllers
- ❌ Don't use long transactions

---

## Concurrency Handling

### Optimistic Locking
- **Field**: `version` (Integer) on entities
- **Entities**: `Product`, `Inventory`
- **Pattern**: Check version before update, throw `ConcurrencyException` on conflict

### Pessimistic Locking
- **Use Case**: Critical stock operations
- **Pattern**: `SELECT FOR UPDATE` via repository
- **Example**: Stock reservation during checkout

### Stock Reservation Pattern
1. Reserve stock (pessimistic lock)
2. Create invoice (transaction)
3. Release reservation or convert to sale

---

## Key Design Decisions

### 1. Service Interfaces
- ✅ All services have interfaces
- ✅ Controllers depend on interfaces
- ✅ Enables testing and flexibility

### 2. Separate Create/Update DTOs
- ✅ `CreateProductRequest` - All fields required
- ✅ `UpdateProductRequest` - All fields optional
- ✅ Avoids confusion, enables partial updates

### 3. Response DTOs (List vs Detail)
- ✅ `ProductResponse` - Summary (for lists)
- ✅ `ProductDetailResponse` - Full details (for single item)
- ✅ Optimizes payload size

### 4. Soft Deletes
- ✅ Entities: `User`, `Product`, `CashierCounter`
- ✅ Pattern: `deleted_at` field
- ✅ Repositories filter deleted records

### 5. Base Entities
- ✅ `AbstractEntity` - Common fields (id, createdAt, updatedAt)
- ✅ `SoftDeletableEntity` - Extends AbstractEntity, adds deletedAt
- ✅ `VersionedEntity` - Adds version field

---

## Technology Stack

### Core
- **Java**: 21
- **Spring Boot**: Latest stable version
- **JPA/Hibernate**: For database access
- **PostgreSQL**: Database

### Security
- **Spring Security**: Authentication & authorization

### Real-time
- **Spring WebSocket**: WebSocket support

### Mapping
- **MapStruct**: Entity-DTO mapping (recommended)

### Validation
- **Bean Validation**: `javax.validation` (JSR 303)

### Build Tool
- **Maven** or **Gradle**

---

## Naming Conventions

### Classes
- **Controllers**: `{Resource}Controller.java` (e.g., `ProductController.java`)
- **Services**: `I{Resource}Service.java` (interface), `{Resource}ServiceImpl.java` (impl)
- **Repositories**: `{Entity}Repository.java` (e.g., `ProductRepository.java`)
- **Entities**: `{TableName}.java` (singular, e.g., `Product.java`)
- **DTOs**: `Create{Resource}Request.java`, `Update{Resource}Request.java`, `{Resource}Response.java`
- **Mappers**: `{Entity}Mapper.java` (e.g., `ProductMapper.java`)
- **Exceptions**: `{Type}Exception.java` (e.g., `EntityNotFoundException.java`)

### Packages
- Lowercase, singular nouns
- Feature-based: `product`, `sales`, `inventory`
- Layer-based: `controller`, `service`, `repository`

---

## Configuration Files

### Application Configuration
- `application.yml` - Base configuration
- `application-dev.yml` - Development profile
- `application-prod.yml` - Production profile

### Key Configuration Areas
- Database connection (JPA, DataSource)
- Security settings
- WebSocket settings
- Logging configuration
- Transaction settings

---

## Testing Strategy

### Test Structure
```
test/
└── java/
    └── com/
        └── jspcs/
            └── pos/
                ├── controller/    # Integration tests
                ├── service/       # Unit tests
                ├── repository/    # Integration tests
                └── integration/   # End-to-end tests
```

### Test Types
- **Unit Tests**: Service layer (mock repositories)
- **Integration Tests**: Controller, Repository (test database)
- **End-to-End Tests**: Full flow testing

---

## Key Principles

### SOLID Principles
- **Single Responsibility**: Each class has one responsibility
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Interfaces can be substituted
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions (interfaces)

### Clean Architecture
- **Separation of Concerns**: Clear layer boundaries
- **Dependency Rule**: Dependencies point inward (controller → service → repository)
- **Independence**: Business logic independent of frameworks
- **Testability**: Easy to test (dependency injection)

---

## Documentation Files

1. **ARCHITECTURE.md** - Detailed architecture documentation
2. **PROJECT_STRUCTURE.md** - Complete directory structure
3. **ARCHITECTURE_SUMMARY.md** - This file (quick reference)
4. **DATABASE_DESIGN.md** - Database schema documentation
5. **SCHEMA_SUMMARY.md** - Database schema quick reference

---

## Next Steps

1. ✅ Review architecture documentation
2. ⏭️ Create project structure (directories)
3. ⏭️ Set up build configuration (pom.xml/build.gradle)
4. ⏭️ Create base classes (AbstractEntity, etc.)
5. ⏭️ Configure Spring Boot (application.yml)
6. ⏭️ Set up database configuration
7. ⏭️ Implement security configuration
8. ⏭️ Implement WebSocket configuration
9. ⏭️ Create exception handling infrastructure
10. ⏭️ Start implementing domain modules

---

**Status**: ✅ Architecture design complete - Ready for implementation

