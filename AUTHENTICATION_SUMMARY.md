# Authentication & Authorization Summary
## JSPCS POS - Quick Reference Guide

---

## Authentication Flow (Quick View)

```
1. Client → POST /api/auth/login (username, password)
2. LoginController → AuthenticationService.authenticate()
3. UserDetailsService → Load user, validate password (BCrypt)
4. Spring Security → Create session, store Authentication
5. Response → Success + session cookie
6. Subsequent requests → Session cookie → SecurityContext → Authorization check
```

---

## Database Tables

### Primary Tables
- **users** - User accounts (username, password_hash, role_id, cashier_counter_id, is_active, deleted_at)
- **roles** - Role definitions (name: 'ADMIN', 'CASHIER')
- **cashier_counters** - Counter/workstation info (optional binding)

### Key Fields for Authentication
- `username` - Login identifier
- `password_hash` - BCrypt hash
- `role_id` - User role
- `cashier_counter_id` - Optional counter binding
- `is_active` - Account enabled/disabled
- `deleted_at` - Soft delete marker

---

## Spring Security Configuration

### Key Components

#### 1. SecurityConfig
- **Location**: `config.security.SecurityConfig.java`
- **Key Features**:
  - BCrypt password encoder (strength 12)
  - DaoAuthenticationProvider
  - Session management (1 session per user)
  - CSRF protection
  - Role-based authorization

#### 2. UserDetailsService
- **Location**: `security.userdetails.UserDetailsServiceImpl.java`
- **Responsibilities**:
  - Load user by username
  - Build GrantedAuthority list from role
  - Return UserDetails object

#### 3. AuthenticationService
- **Location**: `service.auth.AuthenticationService.java`
- **Responsibilities**:
  - Authenticate user (username/password)
  - Update last_login_at
  - Build login response

#### 4. Authentication Handlers
- **Success Handler**: Redirect based on role
- **Failure Handler**: Return error message
- **Logout Handler**: Invalidate session

---

## Security Configuration Summary

### Password Encoding
```java
BCryptPasswordEncoder(12)  // Strength 12
```

### Session Management
- **Creation Policy**: `IF_REQUIRED` (create on login)
- **Maximum Sessions**: 1 per user
- **Concurrent Handling**: Kick out old session
- **Timeout**: 30 minutes (configurable)
- **Cookie**: HttpOnly, Secure (production), SameSite=Lax

### Authorization Rules
```java
/api/auth/login, /api/auth/logout → permitAll()
/api/admin/** → hasRole('ADMIN')
/api/cashier/** → hasAnyRole('ADMIN', 'CASHIER')
/api/reports/** → hasRole('ADMIN')
/** → authenticated()
```

### Method Security
- **Annotation**: `@PreAuthorize`
- **Enable**: `@EnableMethodSecurity`
- **Location**: Controller methods

---

## Role-Restricted Endpoint Examples

### Example 1: Admin-Only Endpoint
```java
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    
    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        // Only ADMIN can access
    }
}
```

### Example 2: Cashier + Admin Endpoint
```java
@RestController
@RequestMapping("/api/cashier")
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
public class CashierController {
    
    @PostMapping("/invoices")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<InvoiceResponse> createInvoice(@Valid @RequestBody CreateInvoiceRequest request) {
        // Both ADMIN and CASHIER can access
    }
}
```

### Example 3: Getting Current User
```java
@PostMapping("/invoices")
public ResponseEntity<InvoiceResponse> createInvoice(
        @Valid @RequestBody CreateInvoiceRequest request,
        Authentication authentication) {
    
    String username = authentication.getName();
    Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
    // Use username and authorities
}
```

---

## Security Annotations

### Class-Level
```java
@PreAuthorize("hasRole('ADMIN')")  // All methods require ADMIN
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")  // Either role
```

### Method-Level
```java
@PreAuthorize("hasRole('ADMIN')")  // Method requires ADMIN
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")  // Either role
@Secured("ROLE_ADMIN")  // Alternative syntax
```

---

## Authentication Checklist

### User Authentication
- ✅ User exists (username match)
- ✅ User is active (is_active = TRUE)
- ✅ User not soft-deleted (deleted_at IS NULL)
- ✅ Role is active
- ✅ Password matches BCrypt hash

### Session Management
- ✅ Session created on login
- ✅ Session cookie set (HttpOnly, Secure)
- ✅ One session per user
- ✅ Old session invalidated on new login
- ✅ Session timeout configured

### Authorization
- ✅ Roles checked at endpoint level
- ✅ Method-level security enabled
- ✅ CSRF protection enabled
- ✅ CORS configured for LAN

---

## Key Files Structure

```
config/
└── security/
    └── SecurityConfig.java

security/
├── config/
│   └── SecurityConfig.java
└── userdetails/
    └── UserDetailsServiceImpl.java

service/
└── auth/
    ├── IAuthenticationService.java
    └── AuthenticationServiceImpl.java

controller/
└── auth/
    ├── AuthController.java
    └── LoginController.java

exception/
└── model/
    └── AuthenticationException.java
```

---

## Configuration Files

### application.yml
```yaml
server:
  servlet:
    session:
      timeout: 30m
      cookie:
        http-only: true
        secure: false  # true in production with HTTPS
        same-site: lax
        name: JSESSIONID

spring:
  security:
    user:
      name: admin
      password: ${ADMIN_PASSWORD:admin123}  # Change in production
```

---

## Security Best Practices

### DO:
- ✅ Use BCrypt for password hashing (strength 12)
- ✅ Store passwords as hashes (never plain text)
- ✅ Check user is_active before authentication
- ✅ Exclude soft-deleted users from authentication
- ✅ Use session-based authentication (no JWT refresh)
- ✅ Enable CSRF protection
- ✅ Use @PreAuthorize for method-level security
- ✅ Limit sessions to 1 per user
- ✅ Set session timeout appropriately
- ✅ Use HttpOnly cookies
- ✅ Use Secure cookies in production (with HTTPS)

### DON'T:
- ❌ Don't store passwords in plain text
- ❌ Don't disable CSRF protection (except for WebSocket)
- ❌ Don't use weak password encoders
- ❌ Don't allow multiple sessions per user (for POS system)
- ❌ Don't expose authentication details in error messages
- ❌ Don't use JWT refresh tokens (session-based only)

---

## Troubleshooting

### Common Issues

#### 1. Authentication Fails
- Check username exists in database
- Verify password hash matches BCrypt format
- Check user is_active = TRUE
- Check deleted_at IS NULL
- Verify role is_active = TRUE

#### 2. Authorization Fails
- Check role name matches (case-sensitive: 'ADMIN', 'CASHIER')
- Verify @PreAuthorize annotation syntax
- Check SecurityConfig authorization rules
- Verify user has correct role

#### 3. Session Issues
- Check session timeout configuration
- Verify session cookie settings
- Check if session is being invalidated
- Verify session storage (in-memory vs Redis)

---

## Summary

This authentication system provides:

✅ **Offline Authentication**: LAN-based, no internet required  
✅ **Secure Password Storage**: BCrypt hashing (strength 12)  
✅ **Session-Based**: HTTP sessions (no OAuth, no JWT refresh)  
✅ **Role-Based Access**: ADMIN and CASHIER roles  
✅ **Counter Binding**: Optional cashier counter binding  
✅ **Permission-Based API**: Method-level security with @PreAuthorize  
✅ **Secure Configuration**: CSRF, session management, secure cookies  

**Status**: ✅ Authentication design complete - Ready for implementation

