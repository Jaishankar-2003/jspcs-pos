# Project Structure Reference
## JSPCS POS - Spring Boot Package Organization

---

## Complete Directory Structure

```
jspcs-pos/
│
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── jspcs/
│   │   │           └── pos/
│   │   │               │
│   │   │               ├── PosApplication.java
│   │   │               │
│   │   │               ├── config/
│   │   │               │   ├── persistence/
│   │   │               │   │   ├── JpaConfig.java
│   │   │               │   │   └── TransactionConfig.java
│   │   │               │   ├── security/
│   │   │               │   │   ├── SecurityConfig.java
│   │   │               │   │   └── PasswordEncoderConfig.java
│   │   │               │   ├── websocket/
│   │   │               │   │   └── WebSocketConfig.java
│   │   │               │   ├── jackson/
│   │   │               │   │   └── JacksonConfig.java
│   │   │               │   └── cors/
│   │   │               │       └── CorsConfig.java
│   │   │               │
│   │   │               ├── controller/
│   │   │               │   ├── auth/
│   │   │               │   │   ├── AuthController.java
│   │   │               │   │   └── LoginController.java
│   │   │               │   ├── user/
│   │   │               │   │   └── UserController.java
│   │   │               │   ├── product/
│   │   │               │   │   └── ProductController.java
│   │   │               │   ├── inventory/
│   │   │               │   │   └── InventoryController.java
│   │   │               │   ├── sales/
│   │   │               │   │   ├── InvoiceController.java
│   │   │               │   │   └── CartController.java
│   │   │               │   ├── payment/
│   │   │               │   │   └── PaymentController.java
│   │   │               │   ├── report/
│   │   │               │   │   └── ReportController.java
│   │   │               │   └── admin/
│   │   │               │       ├── AdminController.java
│   │   │               │       └── BackupController.java
│   │   │               │
│   │   │               ├── service/
│   │   │               │   ├── auth/
│   │   │               │   │   ├── IAuthService.java
│   │   │               │   │   └── AuthServiceImpl.java
│   │   │               │   ├── user/
│   │   │               │   │   ├── IUserService.java
│   │   │               │   │   └── UserServiceImpl.java
│   │   │               │   ├── product/
│   │   │               │   │   ├── IProductService.java
│   │   │               │   │   └── ProductServiceImpl.java
│   │   │               │   ├── inventory/
│   │   │               │   │   ├── IInventoryService.java
│   │   │               │   │   ├── InventoryServiceImpl.java
│   │   │               │   │   └── StockReservationService.java
│   │   │               │   ├── sales/
│   │   │               │   │   ├── ISalesService.java
│   │   │               │   │   ├── SalesServiceImpl.java
│   │   │               │   │   ├── InvoiceService.java
│   │   │               │   │   └── CartService.java
│   │   │               │   ├── payment/
│   │   │               │   │   ├── IPaymentService.java
│   │   │               │   │   └── PaymentServiceImpl.java
│   │   │               │   ├── report/
│   │   │               │   │   ├── IReportService.java
│   │   │               │   │   └── ReportServiceImpl.java
│   │   │               │   └── notification/
│   │   │               │       ├── INotificationService.java
│   │   │               │       └── NotificationServiceImpl.java
│   │   │               │
│   │   │               ├── repository/
│   │   │               │   ├── base/
│   │   │               │   │   ├── BaseRepository.java
│   │   │               │   │   └── SoftDeleteRepository.java
│   │   │               │   ├── custom/
│   │   │               │   │   └── (custom repository implementations)
│   │   │               │   ├── UserRepository.java
│   │   │               │   ├── RoleRepository.java
│   │   │               │   ├── CashierCounterRepository.java
│   │   │               │   ├── ProductRepository.java
│   │   │               │   ├── InventoryRepository.java
│   │   │               │   ├── StockMovementRepository.java
│   │   │               │   ├── SalesInvoiceRepository.java
│   │   │               │   ├── InvoiceItemRepository.java
│   │   │               │   ├── PaymentRepository.java
│   │   │               │   ├── GstTaxDetailRepository.java
│   │   │               │   ├── ManualEntryLogRepository.java
│   │   │               │   ├── AuditLogRepository.java
│   │   │               │   ├── LicenseRepository.java
│   │   │               │   └── BackupMetadataRepository.java
│   │   │               │
│   │   │               ├── entity/
│   │   │               │   ├── base/
│   │   │               │   │   ├── AbstractEntity.java
│   │   │               │   │   ├── SoftDeletableEntity.java
│   │   │               │   │   └── VersionedEntity.java
│   │   │               │   ├── user/
│   │   │               │   │   ├── User.java
│   │   │               │   │   ├── Role.java
│   │   │               │   │   └── CashierCounter.java
│   │   │               │   ├── product/
│   │   │               │   │   ├── Product.java
│   │   │               │   │   ├── Inventory.java
│   │   │               │   │   └── StockMovement.java
│   │   │               │   ├── sales/
│   │   │               │   │   ├── SalesInvoice.java
│   │   │               │   │   ├── InvoiceItem.java
│   │   │               │   │   ├── Payment.java
│   │   │               │   │   └── GstTaxDetail.java
│   │   │               │   └── system/
│   │   │               │       ├── ManualEntryLog.java
│   │   │               │       ├── AuditLog.java
│   │   │               │       ├── License.java
│   │   │               │       └── BackupMetadata.java
│   │   │               │
│   │   │               ├── dto/
│   │   │               │   ├── request/
│   │   │               │   │   ├── auth/
│   │   │               │   │   │   └── LoginRequest.java
│   │   │               │   │   ├── user/
│   │   │               │   │   │   ├── CreateUserRequest.java
│   │   │               │   │   │   └── UpdateUserRequest.java
│   │   │               │   │   ├── product/
│   │   │               │   │   │   ├── CreateProductRequest.java
│   │   │               │   │   │   ├── UpdateProductRequest.java
│   │   │               │   │   │   └── ProductSearchRequest.java
│   │   │               │   │   ├── inventory/
│   │   │               │   │   │   ├── StockAdjustmentRequest.java
│   │   │               │   │   │   └── StockReservationRequest.java
│   │   │               │   │   ├── sales/
│   │   │               │   │   │   ├── CreateInvoiceRequest.java
│   │   │               │   │   │   └── AddToCartRequest.java
│   │   │               │   │   └── payment/
│   │   │               │   │       └── ProcessPaymentRequest.java
│   │   │               │   ├── response/
│   │   │               │   │   ├── common/
│   │   │               │   │   │   ├── ErrorResponse.java
│   │   │               │   │   │   ├── PagedResponse.java
│   │   │               │   │   │   └── ApiResponse.java
│   │   │               │   │   ├── auth/
│   │   │               │   │   │   └── LoginResponse.java
│   │   │               │   │   ├── user/
│   │   │               │   │   │   ├── UserResponse.java
│   │   │               │   │   │   └── UserListResponse.java
│   │   │               │   │   ├── product/
│   │   │               │   │   │   ├── ProductResponse.java
│   │   │               │   │   │   ├── ProductDetailResponse.java
│   │   │               │   │   │   └── ProductListResponse.java
│   │   │               │   │   ├── inventory/
│   │   │               │   │   │   ├── InventoryResponse.java
│   │   │               │   │   │   └── StockMovementResponse.java
│   │   │               │   │   ├── sales/
│   │   │               │   │   │   ├── InvoiceResponse.java
│   │   │               │   │   │   ├── InvoiceDetailResponse.java
│   │   │               │   │   │   └── InvoiceListResponse.java
│   │   │               │   │   └── payment/
│   │   │               │   │       └── PaymentResponse.java
│   │   │               │   └── internal/
│   │   │               │       ├── InvoiceCalculationDto.java
│   │   │               │       └── StockReservationDto.java
│   │   │               │
│   │   │               ├── mapper/
│   │   │               │   ├── UserMapper.java
│   │   │               │   ├── ProductMapper.java
│   │   │               │   ├── InventoryMapper.java
│   │   │               │   ├── SalesInvoiceMapper.java
│   │   │               │   ├── InvoiceItemMapper.java
│   │   │               │   ├── PaymentMapper.java
│   │   │               │   └── (other mappers)
│   │   │               │
│   │   │               ├── exception/
│   │   │               │   ├── model/
│   │   │               │   │   ├── BusinessException.java
│   │   │               │   │   ├── EntityNotFoundException.java
│   │   │               │   │   ├── ValidationException.java
│   │   │               │   │   ├── ConcurrencyException.java
│   │   │               │   │   ├── InsufficientStockException.java
│   │   │               │   │   ├── PaymentException.java
│   │   │               │   │   └── AuthenticationException.java
│   │   │               │   └── handler/
│   │   │               │       └── GlobalExceptionHandler.java
│   │   │               │
│   │   │               ├── security/
│   │   │               │   ├── config/
│   │   │               │   │   └── SecurityConfig.java
│   │   │               │   ├── userdetails/
│   │   │               │   │   └── UserDetailsServiceImpl.java
│   │   │               │   └── filter/
│   │   │               │       └── (security filters if needed)
│   │   │               │
│   │   │               ├── websocket/
│   │   │               │   ├── config/
│   │   │               │   │   └── WebSocketConfig.java
│   │   │               │   ├── handler/
│   │   │               │   │   └── NotificationWebSocketHandler.java
│   │   │               │   ├── message/
│   │   │               │   │   ├── StockUpdateMessage.java
│   │   │               │   │   ├── PriceUpdateMessage.java
│   │   │               │   │   └── NotificationMessage.java
│   │   │               │   └── service/
│   │   │               │       └── WebSocketNotificationService.java
│   │   │               │
│   │   │               ├── util/
│   │   │               │   ├── datetime/
│   │   │               │   │   └── DateTimeUtil.java
│   │   │               │   ├── validation/
│   │   │               │   │   └── ValidationUtil.java
│   │   │               │   ├── crypto/
│   │   │               │   │   └── PasswordUtil.java
│   │   │               │   └── json/
│   │   │               │       └── JsonUtil.java
│   │   │               │
│   │   │               └── validation/
│   │   │                   ├── BarcodeValidator.java
│   │   │                   ├── GstRateValidator.java
│   │   │                   └── PaymentModeValidator.java
│   │   │
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       ├── db/
│   │       │   └── migration/
│   │       │       └── V1__Initial_schema.sql (or use schema.sql)
│   │       └── logback-spring.xml
│   │
│   └── test/
│       └── java/
│           └── com/
│               └── jspcs/
│                   └── pos/
│                       ├── controller/
│                       │   ├── ProductControllerTest.java
│                       │   └── InvoiceControllerTest.java
│                       ├── service/
│                       │   ├── ProductServiceTest.java
│                       │   └── SalesServiceTest.java
│                       ├── repository/
│                       │   ├── ProductRepositoryTest.java
│                       │   └── InventoryRepositoryTest.java
│                       └── integration/
│                           ├── SalesIntegrationTest.java
│                           └── InventoryIntegrationTest.java
│
├── pom.xml (or build.gradle)
├── README.md
├── .gitignore
└── docs/
    ├── ARCHITECTURE.md
    ├── PROJECT_STRUCTURE.md (this file)
    └── API.md
```

---

## Package Organization Principles

### 1. Feature-Based Organization (Primary)
- Group by feature/domain (user, product, sales, etc.)
- Each feature has its own package in controller, service, repository
- Benefits: Easy to locate code, clear feature boundaries

### 2. Layer-Based Organization (Secondary)
- Clear separation: controller → service → repository → entity
- Each layer in separate package
- Benefits: Clear layer boundaries, easy to understand flow

### 3. Common/Shared Code
- `config/` - Configuration classes
- `util/` - Utility classes
- `exception/` - Exception handling
- `security/` - Security configuration
- `websocket/` - WebSocket infrastructure

---

## Key Package Details

### `com.jspcs.pos.config`
**Purpose**: Spring Boot configuration classes

**Organization**: By concern (persistence, security, websocket, etc.)

**Classes**: 
- Configuration beans
- Bean definitions
- Property bindings

### `com.jspcs.pos.controller`
**Purpose**: REST API endpoints

**Organization**: By feature/domain

**Naming**: `{Resource}Controller.java`

**Responsibilities**:
- HTTP method mapping
- Request/response handling
- Validation
- DTO conversion

### `com.jspcs.pos.service`
**Purpose**: Business logic

**Organization**: By feature/domain

**Naming**: 
- Interface: `I{Resource}Service.java`
- Implementation: `{Resource}ServiceImpl.java`

**Responsibilities**:
- Business logic
- Transaction management
- Orchestration
- Exception throwing

### `com.jspcs.pos.repository`
**Purpose**: Data access

**Organization**: Flat structure (all repositories at same level)

**Naming**: `{Entity}Repository.java`

**Pattern**: Extend `JpaRepository<Entity, UUID>`

### `com.jspcs.pos.entity`
**Purpose**: JPA entities

**Organization**: By domain, with base entities in `base/`

**Naming**: `{TableName}.java` (singular)

**Structure**:
- Base entities in `base/`
- Domain entities in domain packages

### `com.jspcs.pos.dto`
**Purpose**: Data Transfer Objects

**Organization**: By direction (request/response/internal)

**Structure**:
- `request/` - Organized by feature
- `response/` - Organized by feature, includes `common/`
- `internal/` - Service-to-service DTOs

**Naming**:
- Request: `Create{Resource}Request.java`, `Update{Resource}Request.java`
- Response: `{Resource}Response.java`, `{Resource}DetailResponse.java`
- Internal: `{Resource}Dto.java`

### `com.jspcs.pos.mapper`
**Purpose**: Entity-DTO mapping

**Organization**: Flat structure

**Naming**: `{Entity}Mapper.java`

**Technology**: MapStruct interfaces

### `com.jspcs.pos.exception`
**Purpose**: Exception handling

**Organization**: 
- `model/` - Exception classes
- `handler/` - Exception handlers

**Structure**:
- Base exception in `model/`
- Specific exceptions in `model/`
- Global handler in `handler/`

### `com.jspcs.pos.security`
**Purpose**: Security configuration

**Organization**: By concern (config, userdetails, filter)

**Classes**:
- Security configuration
- UserDetailsService implementation
- Security filters (if needed)

### `com.jspcs.pos.websocket`
**Purpose**: WebSocket infrastructure

**Organization**: By concern (config, handler, message, service)

**Classes**:
- WebSocket configuration
- Message handlers
- Message DTOs
- Notification service

---

## Naming Conventions

### Classes

#### Controllers
- `{Resource}Controller.java` (e.g., `ProductController.java`)

#### Services
- Interface: `I{Resource}Service.java` (e.g., `IProductService.java`)
- Implementation: `{Resource}ServiceImpl.java` (e.g., `ProductServiceImpl.java`)

#### Repositories
- `{Entity}Repository.java` (e.g., `ProductRepository.java`)

#### Entities
- `{TableName}.java` (singular, e.g., `Product.java`, `SalesInvoice.java`)

#### DTOs
- Request: `Create{Resource}Request.java`, `Update{Resource}Request.java`, `{Resource}SearchRequest.java`
- Response: `{Resource}Response.java`, `{Resource}DetailResponse.java`, `{Resource}ListResponse.java`
- Internal: `{Resource}Dto.java`

#### Mappers
- `{Entity}Mapper.java` (e.g., `ProductMapper.java`)

#### Exceptions
- `{Type}Exception.java` (e.g., `EntityNotFoundException.java`)

#### Configurations
- `{Purpose}Config.java` (e.g., `SecurityConfig.java`)

### Packages
- Lowercase, singular nouns
- Feature-based: `product`, `sales`, `inventory`
- Layer-based: `controller`, `service`, `repository`
- No abbreviations in package names

---

## Dependency Flow

```
Controller → Service (Interface) → Repository
                ↓
            Mapper
                ↓
         Entity/DTO
```

### Rules:
1. **Controllers** depend on Services (interfaces) and DTOs
2. **Services** depend on Repositories, Entities, Mappers, and DTOs
3. **Repositories** depend on Entities only
4. **Mappers** depend on Entities and DTOs
5. **Entities** have no dependencies (except JPA annotations)
6. **DTOs** have no dependencies (except validation annotations)

---

## File Organization Guidelines

### Single Responsibility
- One class per file
- One responsibility per class
- Keep classes focused and small

### Package Cohesion
- Related classes in same package
- Feature-based grouping
- Clear package boundaries

### Interface Segregation
- Service interfaces for all services
- Repository interfaces (JPA interfaces)
- Mapper interfaces (MapStruct)

### Dependency Inversion
- Depend on interfaces, not implementations
- Controllers depend on service interfaces
- Services can depend on concrete repositories (JPA interfaces)

---

## Module Boundaries (Future Consideration)

For larger systems, consider splitting into modules:

```
jspcs-pos/
├── jspcs-pos-core/          # Core entities, repositories
├── jspcs-pos-service/       # Business logic
├── jspcs-pos-api/           # REST API controllers
├── jspcs-pos-security/      # Security configuration
└── jspcs-pos-websocket/     # WebSocket infrastructure
```

For this project, a single module is sufficient.

---

This structure provides:
- ✅ Clear organization
- ✅ Easy navigation
- ✅ Scalable architecture
- ✅ Consistent naming
- ✅ Separation of concerns
- ✅ Testability

