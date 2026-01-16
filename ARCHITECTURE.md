# Spring Boot Project Architecture
## JSPCS POS - Enterprise Application Design

---

## 1. Project Structure Overview

```
jspcs-pos/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── jspcs/
│   │   │           └── pos/
│   │   │               ├── PosApplication.java
│   │   │               │
│   │   │               ├── config/              # Configuration classes
│   │   │               ├── controller/          # REST API controllers
│   │   │               ├── service/             # Business logic layer
│   │   │               ├── repository/          # Data access layer
│   │   │               ├── entity/              # JPA entities
│   │   │               ├── dto/                 # Data Transfer Objects
│   │   │               ├── mapper/              # Entity-DTO mappers
│   │   │               ├── exception/           # Exception handling
│   │   │               ├── security/            # Spring Security config
│   │   │               ├── websocket/           # WebSocket handlers
│   │   │               ├── util/                # Utility classes
│   │   │               └── validation/          # Custom validators
│   │   │
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       └── db/
│   │           └── migration/                   # Flyway/Liquibase scripts
│   │
│   └── test/
│       └── java/
│           └── com/
│               └── jspcs/
│                   └── pos/
│                       ├── controller/
│                       ├── service/
│                       ├── repository/
│                       └── integration/
│
├── pom.xml
├── README.md
└── docs/
    ├── ARCHITECTURE.md (this file)
    └── API.md
```

---

## 2. Package Structure Detail

### Root Package: `com.jspcs.pos`

#### `config/` - Configuration Classes
**Purpose**: Spring Boot configuration and bean definitions

**Packages:**
- `config.persistence/` - JPA, DataSource, Transaction configuration
- `config.security/` - Security configuration classes
- `config.websocket/` - WebSocket configuration
- `config.jackson/` - JSON serialization configuration
- `config.cors/` - CORS configuration
- `config.aspect/` - AOP configuration

**Key Classes:**
- `JpaConfig.java` - JPA/Hibernate configuration
- `TransactionConfig.java` - Transaction manager configuration
- `SecurityConfig.java` - Spring Security configuration
- `WebSocketConfig.java` - WebSocket configuration
- `JacksonConfig.java` - JSON configuration
- `CorsConfig.java` - CORS configuration

#### `controller/` - REST API Controllers
**Purpose**: HTTP request handlers, input validation, response formatting

**Packages:**
- `controller.auth/` - Authentication endpoints
- `controller.user/` - User management
- `controller.product/` - Product catalog
- `controller.inventory/` - Inventory management
- `controller.sales/` - Sales & billing
- `controller.payment/` - Payment processing
- `controller.report/` - Reports
- `controller.admin/` - Admin operations

**Naming Convention:** `{Resource}Controller.java` (e.g., `ProductController.java`)

**Responsibilities:**
- HTTP method mapping (@GetMapping, @PostMapping, etc.)
- Request parameter binding
- Input validation (@Valid)
- DTO conversion (request → service input)
- Response DTO conversion (service output → response)
- HTTP status code handling
- Error response formatting

#### `service/` - Business Logic Layer
**Purpose**: Core business logic, transaction boundaries, orchestration

**Packages:**
- `service.auth/` - Authentication & authorization
- `service.user/` - User management
- `service.product/` - Product business logic
- `service.inventory/` - Inventory management
- `service.sales/` - Sales processing
- `service.payment/` - Payment processing
- `service.report/` - Report generation
- `service.notification/` - WebSocket notifications

**Naming Convention:** `{Resource}Service.java` (e.g., `ProductService.java`)

**Interfaces:**
- Each service has an interface: `I{Resource}Service.java`
- Implementation: `{Resource}ServiceImpl.java`

**Responsibilities:**
- Business logic implementation
- Transaction management (@Transactional)
- Entity operations (via repositories)
- Business rule validation
- Complex operations orchestration
- Cross-cutting concerns (auditing, logging)
- Exception handling (throws business exceptions)

#### `repository/` - Data Access Layer
**Purpose**: Database access, query execution

**Packages:**
- `repository.base/` - Base repository interfaces
- `repository.custom/` - Custom repository implementations

**Naming Convention:** `{Entity}Repository.java` (e.g., `ProductRepository.java`)

**Pattern:**
- Extend `JpaRepository<Entity, UUID>`
- Custom queries with `@Query`
- Custom methods in separate implementation classes

**Responsibilities:**
- CRUD operations
- Custom queries (JPQL, native SQL)
- Soft delete queries
- Optimistic locking handling
- Bulk operations

#### `entity/` - JPA Entities
**Purpose**: Database table mapping, entity relationships

**Packages:**
- `entity.base/` - Base entities (AbstractEntity, SoftDeletableEntity)
- `entity.user/` - User-related entities
- `entity.product/` - Product-related entities
- `entity.sales/` - Sales-related entities
- `entity.system/` - System entities

**Naming Convention:** `{TableName}.java` (e.g., `Product.java`, `SalesInvoice.java`)

**Base Classes:**
- `AbstractEntity.java` - Common fields (id, createdAt, updatedAt)
- `SoftDeletableEntity.java` - Extends AbstractEntity, adds deletedAt
- `VersionedEntity.java` - Adds version field for optimistic locking

**Responsibilities:**
- Table mapping (@Table, @Entity)
- Column mapping (@Column)
- Relationships (@OneToOne, @OneToMany, @ManyToOne, @ManyToMany)
- Validation annotations (@NotNull, @Size, etc.)
- Field-level business rules

#### `dto/` - Data Transfer Objects
**Purpose**: API request/response contracts, service layer data transfer

**Packages:**
- `dto.request/` - Request DTOs (input)
- `dto.response/` - Response DTOs (output)
- `dto.internal/` - Internal service-to-service DTOs

**Naming Convention:**
- Request: `{Resource}Request.java`, `Create{Resource}Request.java`, `Update{Resource}Request.java`
- Response: `{Resource}Response.java`, `{Resource}DetailResponse.java`
- Internal: `{Resource}Dto.java`

**Example Structure:**
```
dto/
├── request/
│   ├── product/
│   │   ├── CreateProductRequest.java
│   │   ├── UpdateProductRequest.java
│   │   └── ProductSearchRequest.java
│   └── sales/
│       └── CreateInvoiceRequest.java
├── response/
│   ├── product/
│   │   ├── ProductResponse.java
│   │   └── ProductListResponse.java
│   └── sales/
│       └── InvoiceResponse.java
└── internal/
    └── InvoiceCalculationDto.java
```

**Responsibilities:**
- API contract definition
- Input validation annotations
- Serialization configuration
- Request/response format

#### `mapper/` - Entity-DTO Mappers
**Purpose**: Convert between entities and DTOs

**Technology:** MapStruct (recommended) or ModelMapper

**Naming Convention:** `{Entity}Mapper.java` (e.g., `ProductMapper.java`)

**Pattern:**
- Interface-based mapping
- Compile-time code generation
- Custom mapping methods for complex conversions

**Responsibilities:**
- Entity → DTO conversion
- DTO → Entity conversion
- List/Collection conversions
- Partial updates (merge strategy)

#### `exception/` - Exception Handling
**Purpose**: Custom exceptions and global exception handling

**Packages:**
- `exception.model/` - Custom exception classes
- `exception.handler/` - Exception handlers

**Custom Exceptions:**
- `BusinessException.java` - Base business exception
- `EntityNotFoundException.java` - Resource not found
- `ValidationException.java` - Validation failures
- `ConcurrencyException.java` - Optimistic locking conflicts
- `InsufficientStockException.java` - Stock-related errors
- `PaymentException.java` - Payment processing errors
- `AuthenticationException.java` - Auth failures

**Exception Handler:**
- `GlobalExceptionHandler.java` - @ControllerAdvice for global exception handling

**Responsibilities:**
- Custom exception definitions
- HTTP status code mapping
- Error response formatting
- Logging integration
- Exception translation (JPA → business exceptions)

#### `security/` - Spring Security
**Purpose**: Authentication, authorization, security configuration

**Packages:**
- `security.config/` - Security configuration
- `security.jwt/` - JWT token handling (if used)
- `security.provider/` - Authentication providers
- `security.userdetails/` - UserDetailsService implementation

**Key Classes:**
- `SecurityConfig.java` - Main security configuration
- `UserDetailsServiceImpl.java` - Load user for authentication
- `JwtTokenProvider.java` - JWT token generation/validation (if JWT)
- `PasswordEncoderConfig.java` - Password encoding configuration

#### `websocket/` - WebSocket Handlers
**Purpose**: Real-time communication with clients

**Packages:**
- `websocket.config/` - WebSocket configuration
- `websocket.handler/` - Message handlers
- `websocket.message/` - Message DTOs
- `websocket.service/` - WebSocket service layer

**Key Classes:**
- `WebSocketConfig.java` - WebSocket configuration
- `NotificationWebSocketHandler.java` - Message handler
- `WebSocketNotificationService.java` - Service to send messages
- `StockUpdateMessage.java` - Message DTOs

#### `util/` - Utility Classes
**Purpose**: Reusable utility methods

**Packages:**
- `util.datetime/` - Date/time utilities
- `util.validation/` - Validation utilities
- `util.crypto/` - Cryptographic utilities
- `util.json/` - JSON utilities

**Key Classes:**
- `DateTimeUtil.java` - Date/time operations
- `ValidationUtil.java` - Validation helpers
- `PasswordUtil.java` - Password utilities
- `JsonUtil.java` - JSON operations

#### `validation/` - Custom Validators
**Purpose**: Custom validation annotations and validators

**Key Classes:**
- `@ValidBarcode.java` - Barcode validation
- `@ValidGstRate.java` - GST rate validation
- `@ValidPaymentMode.java` - Payment mode validation

---

## 3. Layer Separation Strategy

### Architecture Layers (Top to Bottom)

```
┌─────────────────────────────────────────┐
│         Controller Layer                │  HTTP Request/Response
│  (REST API, Validation, DTO Mapping)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Service Layer                  │  Business Logic
│  (Transactions, Orchestration, Rules)   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Repository Layer                 │  Data Access
│  (JPA, Queries, Entity Operations)      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Entity Layer                   │  Database Mapping
│  (JPA Entities, Relationships)          │
└─────────────────────────────────────────┘
```

### Layer Responsibilities

#### Controller Layer
- **DO:**
  - Map HTTP methods to service methods
  - Validate request DTOs
  - Convert request DTOs to service inputs
  - Convert service outputs to response DTOs
  - Handle HTTP status codes
  - Format error responses

- **DON'T:**
  - Access entities directly (use DTOs)
  - Implement business logic
  - Manage transactions
  - Access repositories directly
  - Throw raw exceptions (let GlobalExceptionHandler catch)

#### Service Layer
- **DO:**
  - Implement business logic
  - Manage transactions (@Transactional)
  - Orchestrate multiple operations
  - Call repositories for data access
  - Throw business exceptions
  - Implement business rules
  - Handle optimistic locking

- **DON'T:**
  - Access HTTP request/response directly
  - Return entities (return DTOs or domain objects)
  - Handle HTTP concerns
  - Manage JPA entity lifecycle unnecessarily

#### Repository Layer
- **DO:**
  - Execute database queries
  - Handle entity CRUD operations
  - Implement custom queries
  - Use JPA specifications for dynamic queries
  - Handle soft deletes

- **DON'T:**
  - Implement business logic
  - Manage transactions (handled by service)
  - Return DTOs (return entities)
  - Handle exceptions (let them propagate)

#### Entity Layer
- **DO:**
  - Map database tables
  - Define relationships
  - Include field-level validation
  - Include basic business rules (via constraints)

- **DON'T:**
  - Include business logic (use services)
  - Include DTO annotations
  - Include HTTP concerns
  - Include presentation logic

---

## 4. DTO vs Entity Strategy

### Separation Philosophy

**Entities (JPA):**
- Represent database structure
- Include all database fields
- Include relationships (@OneToMany, etc.)
- Include JPA annotations (@Entity, @Table, @Column)
- Include validation annotations (@NotNull, @Size)
- Can include bidirectional relationships
- Managed by JPA/Hibernate

**DTOs:**
- Represent API contracts
- Only include fields needed for API
- Flat structure (avoid deep nesting)
- Include validation annotations for input
- Include serialization annotations (@JsonInclude, @JsonProperty)
- Unidirectional (request/response flow)

### Mapping Strategy

#### Technology: MapStruct (Recommended)
- **Pros:**
  - Compile-time code generation (performance)
  - Type-safe
  - No runtime dependencies
  - Supports custom mapping methods
  - IDE support

- **Example:**
```java
@Mapper(componentModel = "spring")
public interface ProductMapper {
    ProductResponse toResponse(Product entity);
    Product toEntity(CreateProductRequest request);
    void updateEntity(UpdateProductRequest request, @MappingTarget Product entity);
}
```

#### Alternative: ModelMapper (Runtime)
- Use if MapStruct is not suitable
- Runtime reflection-based
- More flexible but slower

### DTO Design Patterns

#### 1. Request DTOs
- **Separate Create/Update DTOs:**
  - `CreateProductRequest.java` - All fields required
  - `UpdateProductRequest.java` - All fields optional (partial update)
  - Avoid using same DTO for create/update

- **Search/Filter DTOs:**
  - `ProductSearchRequest.java` - Pagination, filtering, sorting
  - Include pagination fields (page, size, sort)

#### 2. Response DTOs
- **List vs Detail:**
  - `ProductResponse.java` - Summary (for lists)
  - `ProductDetailResponse.java` - Full details (for single item)

- **Nested DTOs:**
  - Include related entities as DTOs (not entities)
  - Example: `InvoiceResponse` includes `List<InvoiceItemResponse>`

#### 3. Internal DTOs
- Used for service-to-service communication
- Can be closer to domain model
- Example: `InvoiceCalculationDto` for sales calculation

### Mapping Rules

#### Entity → DTO
- Use mapper interface
- Handle null values
- Convert relationships to nested DTOs
- Handle date/time formatting
- Handle computed fields

#### DTO → Entity
- Use mapper interface
- Set default values
- Handle relationships (load from repository)
- Ignore fields not in entity
- Handle version field for updates (optimistic locking)

#### Update Strategy
- Use `@MappingTarget` in MapStruct
- Merge strategy: update only non-null fields
- Handle version field (optimistic locking)

---

## 5. Exception Handling Design

### Exception Hierarchy

```
Exception (Java)
├── RuntimeException
    ├── BusinessException (base)
    │   ├── EntityNotFoundException
    │   ├── ValidationException
    │   ├── ConcurrencyException
    │   ├── InsufficientStockException
    │   ├── PaymentException
    │   └── AuthenticationException
    └── SystemException (unexpected errors)
```

### Custom Exceptions

#### Base Exception
```java
public class BusinessException extends RuntimeException {
    private final String errorCode;
    private final HttpStatus httpStatus;
    // constructors, getters
}
```

#### Specific Exceptions
- **EntityNotFoundException**: Resource not found (404)
- **ValidationException**: Validation failures (400)
- **ConcurrencyException**: Optimistic locking conflicts (409)
- **InsufficientStockException**: Stock-related errors (422)
- **PaymentException**: Payment processing errors (400)
- **AuthenticationException**: Auth failures (401)

### Global Exception Handler

#### Structure
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(...)
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(...)
    
    @ExceptionHandler(ConcurrencyException.class)
    public ResponseEntity<ErrorResponse> handleConcurrency(...)
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(...)
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(...)
}
```

#### Error Response Format
```java
public class ErrorResponse {
    private String timestamp;
    private int status;
    private String error;
    private String message;
    private String errorCode;
    private String path;
    private List<FieldError> fieldErrors; // for validation errors
}
```

### Exception Handling Flow

1. **Service Layer:**
   - Throws business exceptions
   - Includes error codes
   - Includes contextual information

2. **Global Exception Handler:**
   - Catches all exceptions
   - Maps to HTTP status codes
   - Formats error responses
   - Logs errors (with appropriate levels)

3. **Controller Layer:**
   - Does not catch exceptions
   - Lets them propagate to handler

### Exception Translation

#### Repository → Service
- JPA exceptions → Business exceptions
- Example: `EntityNotFoundException` from JPA → Custom `EntityNotFoundException`

#### Service → Controller
- Business exceptions propagate
- Global handler catches and formats

---

## 6. Transaction Management Approach

### Transaction Boundaries

#### Service Layer Transactions
- **Default:** All public service methods are transactional
- **Pattern:** `@Transactional` on service methods (not on controllers)

#### Transaction Propagation

**REQUIRED (Default):**
- Use for most operations
- Join existing transaction or create new

**REQUIRES_NEW:**
- Use for operations that must run in separate transaction
- Example: Audit logging, notifications

**SUPPORTS:**
- Use for read-only operations
- Join transaction if exists, run non-transactional otherwise

**NOT_SUPPORTED:**
- Use for operations that should not run in transaction
- Suspend existing transaction

**MANDATORY:**
- Use for operations that require transaction
- Throw exception if no transaction exists

**NEVER:**
- Use for operations that must not run in transaction
- Throw exception if transaction exists

### Isolation Levels

#### Default: READ_COMMITTED
- Sufficient for most operations
- PostgreSQL default

#### REPEATABLE_READ:
- Use for critical financial transactions
- Prevents phantom reads
- Example: Invoice creation, payment processing

#### READ_UNCOMMITTED:
- Not recommended
- Only for non-critical operations

### Read-Only Transactions

#### Pattern
```java
@Transactional(readOnly = true)
public List<ProductResponse> getAllProducts() {
    // read-only operations
}
```

**Benefits:**
- Performance optimization
- Prevents accidental writes
- Database optimization hints

### Transaction Best Practices

#### DO:
- Keep transactions short (< 1 second)
- Use read-only transactions for queries
- Use appropriate isolation levels
- Handle optimistic locking conflicts
- Use REQUIRES_NEW for audit/logging

#### DON'T:
- Use transactions in controllers
- Use transactions in repositories (service layer responsibility)
- Use long transactions
- Use SERIALIZABLE unnecessarily (high conflict rate)
- Access external services inside transactions

### Optimistic Locking Handling

#### Pattern
```java
@Transactional
public ProductResponse updateProduct(UUID id, UpdateProductRequest request) {
    Product product = productRepository.findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Product", id));
    
    // Check version (optimistic locking)
    if (!product.getVersion().equals(request.getVersion())) {
        throw new ConcurrencyException("Product was modified by another user");
    }
    
    productMapper.updateEntity(request, product);
    Product updated = productRepository.save(product);
    return productMapper.toResponse(updated);
}
```

### Pessimistic Locking (When Needed)

#### Pattern
```java
@Transactional
public void reserveStock(UUID productId, Integer quantity) {
    Inventory inventory = inventoryRepository.findByIdForUpdate(productId)
        .orElseThrow(...);
    
    if (inventory.getAvailableStock() < quantity) {
        throw new InsufficientStockException(...);
    }
    
    inventory.setReservedStock(inventory.getReservedStock() + quantity);
    inventoryRepository.save(inventory);
}
```

### Transaction Configuration

#### Configuration Class
```java
@Configuration
@EnableTransactionManagement
public class TransactionConfig {
    
    @Bean
    public PlatformTransactionManager transactionManager(EntityManagerFactory emf) {
        JpaTransactionManager txManager = new JpaTransactionManager();
        txManager.setEntityManagerFactory(emf);
        return txManager;
    }
}
```

---

## 7. Additional Architecture Considerations

### Configuration Management

#### Profiles
- `application.yml` - Base configuration
- `application-dev.yml` - Development profile
- `application-prod.yml` - Production profile

#### Key Configuration Areas
- Database connection
- JPA/Hibernate settings
- Security settings
- WebSocket settings
- Logging configuration

### Dependency Injection

#### Strategy
- Constructor injection (preferred)
- Field injection (avoid in production code)
- Setter injection (for optional dependencies)

### Testing Strategy

#### Test Structure
- Unit tests: Service, Util classes
- Integration tests: Controller, Repository
- Test configuration: Separate test profiles

### Documentation

#### API Documentation
- OpenAPI/Swagger for REST APIs
- WebSocket API documentation

### Monitoring & Logging

#### Logging
- SLF4J + Logback
- Structured logging (JSON format for production)
- Log levels: ERROR, WARN, INFO, DEBUG

#### Monitoring
- Actuator endpoints
- Health checks
- Metrics collection

---

## Summary

This architecture provides:

✅ **Clean Separation:** Clear layer boundaries and responsibilities  
✅ **Scalability:** Modular design, easy to extend  
✅ **Maintainability:** Consistent patterns, well-organized packages  
✅ **Testability:** Dependency injection, clear interfaces  
✅ **Performance:** Optimized transactions, efficient mapping  
✅ **Security:** Spring Security integration  
✅ **Real-time:** WebSocket support for notifications  
✅ **Concurrency:** Optimistic locking, transaction isolation  

The architecture follows Spring Boot best practices and enterprise patterns suitable for an offline LAN-based POS system.

