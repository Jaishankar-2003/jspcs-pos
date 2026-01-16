# Authentication & Authorization Design
## JSPCS POS - Offline LAN-Based Security System

---

## 1. Authentication Flow

### High-Level Flow

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. GET /login (if not authenticated)
       │
       ▼
┌─────────────────────────────────────────┐
│     Spring Security Filter Chain        │
│  - Checks session for authentication    │
│  - Redirects to /login if not auth'd    │
└──────┬──────────────────────────────────┘
       │
       │ 2. POST /login (username, password)
       │
       ▼
┌─────────────────────────────────────────┐
│        LoginController                  │
│  - Validates request DTO                │
│  - Calls AuthenticationService          │
└──────┬──────────────────────────────────┘
       │
       │ 3. authenticate(username, password)
       │
       ▼
┌─────────────────────────────────────────┐
│     AuthenticationService               │
│  - Loads user from UserRepository       │
│  - Checks if user is active             │
│  - Validates password (BCrypt)          │
│  - Checks if user is deleted            │
│  - Updates last_login_at                │
└──────┬──────────────────────────────────┘
       │
       │ 4. UserDetails (user, roles, authorities)
       │
       ▼
┌─────────────────────────────────────────┐
│     UserDetailsService                  │
│  - Loads user with role                 │
│  - Builds GrantedAuthority list         │
│  - Returns UserDetails object           │
└──────┬──────────────────────────────────┘
       │
       │ 5. Authentication object
       │
       ▼
┌─────────────────────────────────────────┐
│     Spring Security                     │
│  - Creates session                      │
│  - Stores Authentication in session     │
│  - Redirects to /dashboard              │
└──────┬──────────────────────────────────┘
       │
       │ 6. Authenticated session
       │
       ▼
┌─────────────────────────────────────────┐
│     Subsequent Requests                 │
│  - Session cookie sent with request     │
│  - SecurityContext loads from session   │
│  - Authorization checks performed       │
└─────────────────────────────────────────┘
```

### Detailed Authentication Steps

#### Step 1: Login Request
1. User navigates to `/login` page
2. If already authenticated, redirect to `/dashboard`
3. User enters username and password
4. Form submits to `POST /api/auth/login`

#### Step 2: Authentication Processing
1. **LoginController** receives `LoginRequest` DTO
2. Validates request (username, password not empty)
3. Calls **AuthenticationService.authenticate()**
4. Service loads user by username
5. Checks user exists and is active
6. Checks user is not soft-deleted
7. Validates password using BCrypt
8. Updates `last_login_at` timestamp
9. Loads user role and permissions
10. Builds `UserDetails` object with authorities

#### Step 3: Session Creation
1. Spring Security creates `Authentication` object
2. Stores `Authentication` in HTTP session
3. Returns success response with user info
4. Sets session cookie (HttpOnly, Secure in production)
5. Redirects to appropriate dashboard based on role

#### Step 4: Subsequent Requests
1. Client sends session cookie with each request
2. Spring Security Filter Chain intercepts
3. Loads `Authentication` from session
4. Sets `SecurityContext` with authentication
5. Authorization checks performed
6. Request proceeds if authorized

#### Step 5: Logout
1. User calls `POST /api/auth/logout`
2. Spring Security invalidates session
3. Clears security context
4. Redirects to `/login`

---

## 2. Database Tables Involved

### Primary Tables

#### `users` Table
**Purpose**: User accounts (Admin, Cashiers)

**Key Fields for Authentication:**
```sql
id UUID PRIMARY KEY
username VARCHAR(50) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL      -- BCrypt hash
full_name VARCHAR(100) NOT NULL
role_id UUID NOT NULL REFERENCES roles(id)
cashier_counter_id UUID REFERENCES cashier_counters(id)
is_active BOOLEAN DEFAULT TRUE
last_login_at TIMESTAMP WITH TIME ZONE
deleted_at TIMESTAMP WITH TIME ZONE      -- Soft delete
```

**Authentication Checks:**
- User must exist (username match)
- `deleted_at IS NULL` (not soft-deleted)
- `is_active = TRUE` (user is active)
- Password hash matches BCrypt verification

#### `roles` Table
**Purpose**: Role definitions

**Key Fields:**
```sql
id UUID PRIMARY KEY
name VARCHAR(50) UNIQUE NOT NULL         -- 'ADMIN', 'CASHIER'
description TEXT
permissions JSONB DEFAULT '{}'            -- Future: granular permissions
is_active BOOLEAN DEFAULT TRUE
```

**Roles:**
- `ADMIN` - Full system access
- `CASHIER` - Sales operations, limited access

#### `cashier_counters` Table
**Purpose**: Physical workstation/counter information

**Key Fields:**
```sql
id UUID PRIMARY KEY
counter_number VARCHAR(10) UNIQUE NOT NULL
name VARCHAR(100) NOT NULL
location VARCHAR(100)
ip_address INET
is_active BOOLEAN DEFAULT TRUE
deleted_at TIMESTAMP WITH TIME ZONE
```

**Counter Binding:**
- Cashiers are optionally bound to a counter
- Counter validation during login
- Counter information stored in session

### Relationships

```
users (N) ──> (1) roles
users (N) ──> (1) cashier_counters (optional)
```

### Query for User Authentication

```sql
SELECT u.id, u.username, u.password_hash, u.full_name, 
       u.is_active, u.last_login_at, u.cashier_counter_id,
       r.id as role_id, r.name as role_name, r.permissions,
       cc.id as counter_id, cc.counter_number, cc.name as counter_name
FROM users u
INNER JOIN roles r ON u.role_id = r.id
LEFT JOIN cashier_counters cc ON u.cashier_counter_id = cc.id
WHERE u.username = ?
  AND u.deleted_at IS NULL
  AND u.is_active = TRUE
  AND r.is_active = TRUE
```

---

## 3. Spring Security Configuration Approach

### Configuration Strategy

#### 1. Security Configuration Class

**Location**: `com.jspcs.pos.config.security.SecurityConfig.java`

**Key Components:**
- `PasswordEncoder` bean (BCrypt)
- `UserDetailsService` bean (custom implementation)
- `AuthenticationProvider` (DaoAuthenticationProvider)
- `HttpSecurity` configuration
- Session management
- CSRF configuration
- CORS configuration

#### 2. Configuration Structure

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // For @PreAuthorize, @Secured
public class SecurityConfig {

    private final UserDetailsService userDetailsService;
    private final AuthenticationSuccessHandler authenticationSuccessHandler;
    private final AuthenticationFailureHandler authenticationFailureHandler;
    private final LogoutSuccessHandler logoutSuccessHandler;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);  // Strength 12 for security
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) {
        http
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/auth/login", "/api/websocket/**")
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/auth/logout", "/error", "/login", "/css/**", "/js/**", "/images/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/cashier/**").hasAnyRole("ADMIN", "CASHIER")
                .requestMatchers("/api/reports/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .maximumSessions(1)  // One session per user
                .maxSessionsPreventsLogin(false)  // Kick out old session
                .sessionRegistry(sessionRegistry())
            )
            .authenticationProvider(authenticationProvider())
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/api/auth/login")
                .successHandler(authenticationSuccessHandler)
                .failureHandler(authenticationFailureHandler)
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler(logoutSuccessHandler)
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            )
            .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }
}
```

#### 3. UserDetailsService Implementation

**Location**: `com.jspcs.pos.security.userdetails.UserDetailsServiceImpl.java`

```java
@Service
@Transactional(readOnly = true)
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        if (!user.getIsActive()) {
            throw new DisabledException("User is disabled: " + username);
        }

        Role role = roleRepository.findById(user.getRoleId())
            .orElseThrow(() -> new UsernameNotFoundException("Role not found for user: " + username));

        if (!role.getIsActive()) {
            throw new DisabledException("Role is disabled: " + username);
        }

        List<GrantedAuthority> authorities = buildAuthorities(role);

        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getUsername())
            .password(user.getPasswordHash())
            .authorities(authorities)
            .accountExpired(false)
            .accountLocked(false)
            .credentialsExpired(false)
            .disabled(!user.getIsActive())
            .build();
    }

    private List<GrantedAuthority> buildAuthorities(Role role) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName()));
        
        // Future: Add granular permissions from role.permissions JSONB
        // if (role.getPermissions() != null) {
        //     role.getPermissions().forEach((permission, value) -> {
        //         if (Boolean.TRUE.equals(value)) {
        //             authorities.add(new SimpleGrantedAuthority(permission));
        //         }
        //     });
        // }
        
        return authorities;
    }
}
```

#### 4. Authentication Service

**Location**: `com.jspcs.pos.service.auth.AuthenticationService.java`

```java
@Service
@Transactional
public class AuthenticationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserDetailsService userDetailsService;
    private final AuthenticationManager authenticationManager;

    public LoginResponse authenticate(LoginRequest request) {
        // Load user for additional validation
        User user = userRepository.findByUsernameAndDeletedAtIsNull(request.getUsername())
            .orElseThrow(() -> new AuthenticationException("Invalid username or password"));

        // Check if user is active
        if (!user.getIsActive()) {
            throw new AuthenticationException("User account is disabled");
        }

        // Authenticate using Spring Security
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getUsername(),
                    request.getPassword()
                )
            );

            // Update last login
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

            // Get user details
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            
            // Build response
            return buildLoginResponse(user, userDetails);

        } catch (BadCredentialsException e) {
            throw new AuthenticationException("Invalid username or password");
        }
    }

    private LoginResponse buildLoginResponse(User user, UserDetails userDetails) {
        // Load full user with role and counter
        User fullUser = userRepository.findByIdWithRoleAndCounter(user.getId())
            .orElseThrow();

        LoginResponse response = new LoginResponse();
        response.setUserId(fullUser.getId());
        response.setUsername(fullUser.getUsername());
        response.setFullName(fullUser.getFullName());
        response.setRole(fullUser.getRole().getName());
        response.setAuthorities(userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));
        
        if (fullUser.getCashierCounter() != null) {
            response.setCounterId(fullUser.getCashierCounter().getId());
            response.setCounterNumber(fullUser.getCashierCounter().getCounterNumber());
            response.setCounterName(fullUser.getCashierCounter().getName());
        }

        return response;
    }
}
```

#### 5. Session Management

**Configuration:**
- **Session Creation Policy**: `IF_REQUIRED` (create session on login)
- **Maximum Sessions**: 1 per user
- **Concurrent Session Handling**: Kick out old session (new login invalidates old)
- **Session Timeout**: Configured in `application.yml`
- **Session Cookie**: HttpOnly, Secure (in production), SameSite=Lax

**Session Storage:**
- In-memory session storage (default)
- Future: Consider Redis for multi-server scenarios

**Session Configuration:**
```yaml
server:
  servlet:
    session:
      timeout: 30m  # 30 minutes of inactivity
      cookie:
        http-only: true
        secure: false  # Set to true in production with HTTPS
        same-site: lax
        name: JSESSIONID
```

#### 6. Authentication Handlers

**Success Handler:**
```java
@Component
public class CustomAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, 
                                       HttpServletResponse response, 
                                       Authentication authentication) throws IOException {
        // Store user info in session
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        request.getSession().setAttribute("user", userDetails);

        // Determine redirect URL based on role
        String redirectUrl = determineRedirectUrl(authentication);
        
        response.setStatus(HttpStatus.OK.value());
        response.getWriter().write("{\"success\": true, \"redirectUrl\": \"" + redirectUrl + "\"}");
        response.setContentType("application/json");
    }

    private String determineRedirectUrl(Authentication authentication) {
        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        
        if (authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return "/admin/dashboard";
        } else if (authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_CASHIER"))) {
            return "/cashier/dashboard";
        }
        return "/dashboard";
    }
}
```

**Failure Handler:**
```java
@Component
public class CustomAuthenticationFailureHandler implements AuthenticationFailureHandler {

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, 
                                       HttpServletResponse response, 
                                       AuthenticationException exception) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType("application/json");
        
        String errorMessage = "Invalid username or password";
        if (exception instanceof DisabledException) {
            errorMessage = "User account is disabled";
        } else if (exception instanceof LockedException) {
            errorMessage = "User account is locked";
        }
        
        response.getWriter().write("{\"success\": false, \"message\": \"" + errorMessage + "\"}");
    }
}
```

**Logout Handler:**
```java
@Component
public class CustomLogoutSuccessHandler implements LogoutSuccessHandler {

    @Override
    public void onLogoutSuccess(HttpServletRequest request, 
                               HttpServletResponse response, 
                               Authentication authentication) throws IOException {
        response.setStatus(HttpStatus.OK.value());
        response.setContentType("application/json");
        response.getWriter().write("{\"success\": true, \"message\": \"Logged out successfully\"}");
    }
}
```

---

## 4. Example: Role-Restricted Endpoint

### Example 1: Admin-Only Endpoint

#### Controller
```java
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")  // Class-level security
public class AdminController {

    private final UserService userService;

    // Endpoint 1: Create User (Admin only)
    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")  // Redundant but explicit
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserResponse response = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Endpoint 2: Get All Users (Admin only)
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedResponse<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PagedResponse<UserResponse> response = userService.getAllUsers(page, size);
        return ResponseEntity.ok(response);
    }

    // Endpoint 3: Delete User (Admin only)
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
```

#### Service Implementation
```java
@Service
@Transactional
public class UserServiceImpl implements IUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override
    public UserResponse createUser(CreateUserRequest request) {
        // Business logic - no security annotations needed
        // Security is enforced at controller level
        
        // Check if username exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ValidationException("Username already exists");
        }

        User user = userMapper.toEntity(request);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setIsActive(true);

        User saved = userRepository.save(user);
        return userMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<UserResponse> getAllUsers(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> users = userRepository.findAll(pageable);
        return userMapper.toPagedResponse(users);
    }

    @Override
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User", id));
        user.setDeletedAt(Instant.now());
        userRepository.save(user);
    }
}
```

### Example 2: Cashier-Only Endpoint

#### Controller
```java
@RestController
@RequestMapping("/api/cashier")
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")  // Both roles allowed
public class CashierController {

    private final SalesService salesService;
    private final ProductService productService;

    // Endpoint 1: Create Invoice (Cashier + Admin)
    @PostMapping("/invoices")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<InvoiceResponse> createInvoice(
            @Valid @RequestBody CreateInvoiceRequest request,
            Authentication authentication) {
        
        // Get current user from authentication
        String username = authentication.getName();
        
        InvoiceResponse response = salesService.createInvoice(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Endpoint 2: Get Products (Cashier + Admin)
    @GetMapping("/products")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<List<ProductResponse>> getProducts() {
        List<ProductResponse> products = productService.getAllActiveProducts();
        return ResponseEntity.ok(products);
    }
}
```

### Example 3: Method-Level Security with Permissions

#### Controller
```java
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    // Admin only - Sales Report
    @GetMapping("/sales")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SalesReportResponse> getSalesReport(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        SalesReportResponse report = reportService.generateSalesReport(startDate, endDate);
        return ResponseEntity.ok(report);
    }

    // Admin only - Inventory Report
    @GetMapping("/inventory")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InventoryReportResponse> getInventoryReport() {
        InventoryReportResponse report = reportService.generateInventoryReport();
        return ResponseEntity.ok(report);
    }
}
```

### Example 4: Getting Current User in Controller

#### Controller with Current User
```java
@RestController
@RequestMapping("/api/cashier")
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
public class CashierController {

    private final SalesService salesService;

    @PostMapping("/invoices")
    public ResponseEntity<InvoiceResponse> createInvoice(
            @Valid @RequestBody CreateInvoiceRequest request,
            Authentication authentication) {  // Inject Authentication
        
        // Option 1: Get username
        String username = authentication.getName();
        
        // Option 2: Get authorities
        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        boolean isAdmin = authorities.stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        
        // Option 3: Get custom user details (if using custom Principal)
        // CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        
        InvoiceResponse response = salesService.createInvoice(request, username);
        return ResponseEntity.ok(response);
    }
}
```

#### Alternative: Using @AuthenticationPrincipal

```java
@RestController
@RequestMapping("/api/cashier")
public class CashierController {

    @GetMapping("/profile")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<UserProfileResponse> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {  // Inject UserDetails
        
        String username = userDetails.getUsername();
        // Get user profile
        return ResponseEntity.ok(profile);
    }
}
```

### Security Annotations Reference

#### Class-Level
```java
@PreAuthorize("hasRole('ADMIN')")  // All methods require ADMIN
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")  // Either role allowed
```

#### Method-Level
```java
@PreAuthorize("hasRole('ADMIN')")  // Method requires ADMIN
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")  // Either role allowed
@Secured("ROLE_ADMIN")  // Alternative syntax
@RolesAllowed("ADMIN")  // JSR-250 annotation (requires @EnableGlobalMethodSecurity(jsr250Enabled = true))
```

#### Expression-Based
```java
@PreAuthorize("hasRole('ADMIN') or authentication.name == #username")  // Admin or own profile
@PreAuthorize("hasAuthority('USER_DELETE')")  // Granular permission
```

---

## 5. Security Configuration Summary

### Key Configuration Points

1. **Password Encoding**: BCrypt with strength 12
2. **Authentication Provider**: DaoAuthenticationProvider with custom UserDetailsService
3. **Session Management**: HTTP sessions (in-memory, 1 session per user)
4. **CSRF Protection**: Enabled (except login endpoint)
5. **CORS Configuration**: Configured for LAN access
6. **Method Security**: Enabled with @PreAuthorize
7. **Session Timeout**: 30 minutes (configurable)

### Security Flow Summary

1. **Login**: Username/password → BCrypt verification → Session creation
2. **Authorization**: Session cookie → SecurityContext → Role check → Access granted/denied
3. **Logout**: Session invalidation → Cookie deletion → Redirect to login

### Database Security

- **Password Storage**: BCrypt hash (never plain text)
- **Soft Deletes**: Users marked deleted are excluded from authentication
- **Active Status**: Inactive users cannot authenticate
- **Role Status**: Inactive roles prevent user authentication

---

## Summary

This authentication design provides:

✅ **Offline Authentication**: LAN-based, no external dependencies  
✅ **Secure Password Storage**: BCrypt hashing  
✅ **Session-Based**: HTTP sessions (no OAuth, no JWT refresh)  
✅ **Role-Based Access**: ADMIN and CASHIER roles  
✅ **Counter Binding**: Cashiers can be bound to counters  
✅ **Permission-Based API**: Method-level security with @PreAuthorize  
✅ **Secure Configuration**: CSRF protection, session management, secure cookies  

The design is suitable for an offline LAN-based POS system with multiple concurrent cashiers.

