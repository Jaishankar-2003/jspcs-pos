# Security, Backup & Licensing Design
## JSPCS POS - Enterprise Security & Data Protection

---

## 1. Architecture Overview

### 1.1 Security & Licensing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              SECURITY & LICENSING ARCHITECTURE               │
└─────────────────────────────────────────────────────────────┘

Application Layer
│
├─> License Validation Service
│   ├─> Hardware Binding
│   ├─> License Key Validation
│   ├─> Counter Limit Enforcement
│   └─> Periodic Validation
│
├─> Security Service
│   ├─> Audit Logging
│   ├─> Tamper Detection
│   ├─> Access Control
│   └─> Data Integrity
│
├─> Backup Service
│   ├─> Scheduled Backups
│   ├─> Manual Backup
│   ├─> USB Backup/Restore
│   └─> Backup Verification
│
└─> Database Layer
    ├─> licenses (License records)
    ├─> backup_metadata (Backup tracking)
    └─> audit_logs (Audit trail)
```

---

## 2. Licensing System

### 2.1 License Structure

**Database Table**: `licenses` (already defined in schema)

**License Fields:**
- `license_key`: Unique license key (encrypted/hashed)
- `license_type`: TRIAL, BASIC, PROFESSIONAL, ENTERPRISE
- `max_counters`: Maximum number of cashier counters
- `max_users`: Maximum number of users
- `valid_from`: License start date
- `valid_until`: License expiration date
- `is_active`: License active status
- `hardware_id`: Machine binding (MAC address/hardware fingerprint)
- `activated_at`: Activation timestamp
- `activated_by`: User who activated license

### 2.2 Offline License Validation

#### 2.2.1 License Validation Strategy

**Approach**: Periodic offline validation with hardware binding

**Validation Frequency:**
- **On Application Start**: Validate license
- **Periodic Validation**: Every 24 hours (configurable)
- **Before Critical Operations**: Validate before invoice creation, user creation, etc.
- **Grace Period**: 7 days offline grace period

#### 2.2.2 License Validation Service

**Location**: `com.jspcs.pos.service.licensing.LicenseValidationService.java`

```java
@Service
public class LicenseValidationService {

    private final LicenseRepository licenseRepository;
    private final HardwareIdentificationService hardwareService;
    private final LicenseCryptoService cryptoService;
    private final AuditLogService auditLogService;

    /**
     * Validate license (offline)
     */
    @Transactional(readOnly = true)
    public LicenseValidationResult validateLicense() {
        // 1. Get active license
        License license = licenseRepository.findActiveLicense()
            .orElseThrow(() -> new LicenseNotFoundException("No active license found"));

        // 2. Check license expiration
        LocalDate today = LocalDate.now();
        if (today.isAfter(license.getValidUntil())) {
            auditLogService.log("LICENSE_EXPIRED", license.getId(), null);
            return LicenseValidationResult.expired("License has expired");
        }

        // 3. Validate hardware binding
        String currentHardwareId = hardwareService.getHardwareId();
        if (!currentHardwareId.equals(license.getHardwareId())) {
            auditLogService.log("LICENSE_HARDWARE_MISMATCH", license.getId(), null);
            return LicenseValidationResult.invalid("License hardware binding mismatch");
        }

        // 4. Validate license key (verify signature/checksum)
        if (!cryptoService.validateLicenseKey(license.getLicenseKey(), license)) {
            auditLogService.log("LICENSE_KEY_INVALID", license.getId(), null);
            return LicenseValidationResult.invalid("License key validation failed");
        }

        // 5. Check license type limits
        LicenseLimitCheck limits = checkLicenseLimits(license);
        if (!limits.isWithinLimits()) {
            auditLogService.log("LICENSE_LIMIT_EXCEEDED", license.getId(), null);
            return LicenseValidationResult.limitExceeded(
                "License limit exceeded: " + limits.getViolation()
            );
        }

        // 6. License is valid
        auditLogService.log("LICENSE_VALIDATED", license.getId(), null);
        return LicenseValidationResult.valid(license);
    }

    /**
     * Check license limits (counters, users)
     */
    private LicenseLimitCheck checkLicenseLimits(License license) {
        // Count active counters
        long activeCounters = cashierCounterRepository.countActiveCounters();
        if (activeCounters > license.getMaxCounters()) {
            return LicenseLimitCheck.exceeded("Active counters: " + activeCounters + 
                " exceeds limit: " + license.getMaxCounters());
        }

        // Count active users
        long activeUsers = userRepository.countActiveUsers();
        if (activeUsers > license.getMaxUsers()) {
            return LicenseLimitCheck.exceeded("Active users: " + activeUsers + 
                " exceeds limit: " + license.getMaxUsers());
        }

        return LicenseLimitCheck.withinLimits();
    }

    /**
     * Validate license before operation
     */
    public void validateLicenseOrThrow() {
        LicenseValidationResult result = validateLicense();
        if (!result.isValid()) {
            throw new LicenseValidationException(result.getMessage());
        }
    }
}
```

#### 2.2.3 License Validation Result

```java
public class LicenseValidationResult {
    private boolean valid;
    private License license;
    private String message;
    private ValidationStatus status; // VALID, EXPIRED, INVALID, LIMIT_EXCEEDED

    public static LicenseValidationResult valid(License license) {
        return new LicenseValidationResult(true, license, "License is valid", ValidationStatus.VALID);
    }

    public static LicenseValidationResult expired(String message) {
        return new LicenseValidationResult(false, null, message, ValidationStatus.EXPIRED);
    }

    public static LicenseValidationResult invalid(String message) {
        return new LicenseValidationResult(false, null, message, ValidationStatus.INVALID);
    }

    public static LicenseValidationResult limitExceeded(String message) {
        return new LicenseValidationResult(false, null, message, ValidationStatus.LIMIT_EXCEEDED);
    }
}
```

### 2.3 Machine Binding

#### 2.3.1 Hardware Identification

**Location**: `com.jspcs.pos.service.licensing.HardwareIdentificationService.java`

```java
@Service
public class HardwareIdentificationService {

    /**
     * Get hardware identifier (MAC address or hardware fingerprint)
     */
    public String getHardwareId() {
        try {
            // Method 1: Use MAC address (primary network interface)
            String macAddress = getMacAddress();
            if (macAddress != null && !macAddress.isEmpty()) {
                return hashMacAddress(macAddress);
            }

            // Method 2: Use hardware fingerprint (fallback)
            String hardwareFingerprint = generateHardwareFingerprint();
            return hashHardwareFingerprint(hardwareFingerprint);

        } catch (Exception e) {
            throw new HardwareIdentificationException("Failed to get hardware ID", e);
        }
    }

    /**
     * Get MAC address of primary network interface
     */
    private String getMacAddress() {
        try {
            Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();
            while (networkInterfaces.hasMoreElements()) {
                NetworkInterface networkInterface = networkInterfaces.nextElement();
                
                // Skip loopback and inactive interfaces
                if (networkInterface.isLoopback() || !networkInterface.isUp()) {
                    continue;
                }

                byte[] mac = networkInterface.getHardwareAddress();
                if (mac != null && mac.length > 0) {
                    return formatMacAddress(mac);
                }
            }
        } catch (SocketException e) {
            throw new HardwareIdentificationException("Failed to get MAC address", e);
        }
        return null;
    }

    /**
     * Generate hardware fingerprint (fallback)
     * Combines: OS name, OS version, machine name, processor info
     */
    private String generateHardwareFingerprint() {
        StringBuilder fingerprint = new StringBuilder();
        fingerprint.append(System.getProperty("os.name"));
        fingerprint.append(System.getProperty("os.version"));
        fingerprint.append(System.getProperty("os.arch"));
        fingerprint.append(System.getProperty("user.name"));
        fingerprint.append(System.getenv("COMPUTERNAME")); // Windows
        fingerprint.append(System.getenv("HOSTNAME")); // Linux
        
        // Add processor info if available
        try {
            RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();
            fingerprint.append(runtimeBean.getName());
        } catch (Exception e) {
            // Ignore
        }

        return fingerprint.toString();
    }

    /**
     * Hash MAC address (SHA-256)
     */
    private String hashMacAddress(String macAddress) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(macAddress.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new HardwareIdentificationException("Failed to hash MAC address", e);
        }
    }

    /**
     * Hash hardware fingerprint
     */
    private String hashHardwareFingerprint(String fingerprint) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(fingerprint.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new HardwareIdentificationException("Failed to hash hardware fingerprint", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder hex = new StringBuilder();
        for (byte b : bytes) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }

    private String formatMacAddress(byte[] mac) {
        StringBuilder formatted = new StringBuilder();
        for (int i = 0; i < mac.length; i++) {
            formatted.append(String.format("%02X%s", mac[i], (i < mac.length - 1) ? "-" : ""));
        }
        return formatted.toString();
    }
}
```

#### 2.3.2 License Activation

**Location**: `com.jspcs.pos.service.licensing.LicenseActivationService.java`

```java
@Service
@PreAuthorize("hasRole('ADMIN')")
public class LicenseActivationService {

    private final LicenseRepository licenseRepository;
    private final HardwareIdentificationService hardwareService;
    private final LicenseCryptoService cryptoService;
    private final AuditLogService auditLogService;

    /**
     * Activate license
     */
    @Transactional
    public License activateLicense(String licenseKey, UUID userId) {
        // 1. Validate license key format
        if (!cryptoService.validateLicenseKeyFormat(licenseKey)) {
            throw new InvalidLicenseKeyException("Invalid license key format");
        }

        // 2. Decrypt/validate license key
        LicenseData licenseData = cryptoService.decryptLicenseKey(licenseKey);
        if (licenseData == null) {
            throw new InvalidLicenseKeyException("License key decryption failed");
        }

        // 3. Get hardware ID
        String hardwareId = hardwareService.getHardwareId();

        // 4. Check if license already exists
        Optional<License> existing = licenseRepository.findByLicenseKeyHash(
            cryptoService.hashLicenseKey(licenseKey)
        );
        
        if (existing.isPresent()) {
            License existingLicense = existing.get();
            if (existingLicense.getHardwareId().equals(hardwareId)) {
                throw new LicenseAlreadyActivatedException("License already activated on this machine");
            } else {
                throw new LicenseAlreadyActivatedException("License already activated on another machine");
            }
        }

        // 5. Create license record
        License license = new License();
        license.setLicenseKey(cryptoService.hashLicenseKey(licenseKey)); // Store hash only
        license.setLicenseType(licenseData.getLicenseType());
        license.setMaxCounters(licenseData.getMaxCounters());
        license.setMaxUsers(licenseData.getMaxUsers());
        license.setValidFrom(licenseData.getValidFrom());
        license.setValidUntil(licenseData.getValidUntil());
        license.setHardwareId(hardwareId);
        license.setIsActive(true);
        license.setActivatedAt(Instant.now());
        license.setActivatedBy(userId);

        License saved = licenseRepository.save(license);

        // 6. Audit log
        auditLogService.log("LICENSE_ACTIVATED", saved.getId(), userId);

        return saved;
    }
}
```

### 2.4 Counter-Based License Limits

#### 2.4.1 License Limit Enforcement

**Enforcement Points:**
1. **Counter Creation**: Check max_counters before creating new counter
2. **User Creation**: Check max_users before creating new user
3. **Periodic Validation**: Validate limits periodically

**Location**: `com.jspcs.pos.service.licensing.LicenseLimitEnforcementService.java`

```java
@Service
public class LicenseLimitEnforcementService {

    private final LicenseValidationService licenseValidationService;
    private final LicenseRepository licenseRepository;
    private final CashierCounterRepository counterRepository;
    private final UserRepository userRepository;

    /**
     * Check if counter creation is allowed
     */
    @Transactional(readOnly = true)
    public void validateCounterCreation() {
        License license = licenseRepository.findActiveLicense()
            .orElseThrow(() -> new LicenseNotFoundException("No active license found"));

        long activeCounters = counterRepository.countActiveCounters();
        if (activeCounters >= license.getMaxCounters()) {
            throw new LicenseLimitExceededException(
                "Counter limit exceeded. Maximum counters: " + license.getMaxCounters()
            );
        }
    }

    /**
     * Check if user creation is allowed
     */
    @Transactional(readOnly = true)
    public void validateUserCreation() {
        License license = licenseRepository.findActiveLicense()
            .orElseThrow(() -> new LicenseNotFoundException("No active license found"));

        long activeUsers = userRepository.countActiveUsers();
        if (activeUsers >= license.getMaxUsers()) {
            throw new LicenseLimitExceededException(
                "User limit exceeded. Maximum users: " + license.getMaxUsers()
            );
        }
    }

    /**
     * Get license limit status
     */
    @Transactional(readOnly = true)
    public LicenseLimitStatus getLicenseLimitStatus() {
        License license = licenseRepository.findActiveLicense()
            .orElseThrow(() -> new LicenseNotFoundException("No active license found"));

        long activeCounters = counterRepository.countActiveCounters();
        long activeUsers = userRepository.countActiveUsers();

        return LicenseLimitStatus.builder()
            .maxCounters(license.getMaxCounters())
            .currentCounters(activeCounters)
            .remainingCounters(license.getMaxCounters() - activeCounters)
            .maxUsers(license.getMaxUsers())
            .currentUsers(activeUsers)
            .remainingUsers(license.getMaxUsers() - activeUsers)
            .build();
    }
}
```

#### 2.4.2 Integration with Services

**Counter Creation:**
```java
@Service
public class CashierCounterService {

    private final LicenseLimitEnforcementService limitService;

    @Transactional
    public CashierCounter createCounter(CreateCounterRequest request, UUID userId) {
        // Validate license limit
        limitService.validateCounterCreation();

        // Create counter
        // ...
    }
}
```

**User Creation:**
```java
@Service
public class UserService {

    private final LicenseLimitEnforcementService limitService;

    @Transactional
    public User createUser(CreateUserRequest request, UUID userId) {
        // Validate license limit
        limitService.validateUserCreation();

        // Create user
        // ...
    }
}
```

### 2.5 License Key Security

#### 2.5.1 License Key Structure

**License Key Format:**
- Base64 encoded JSON with signature
- Contains: license type, limits, dates, signature
- Signed with private key (vendor)
- Verified with public key (application)

**License Key Generation (Vendor Side):**
```java
public class LicenseKeyGenerator {

    private static final PrivateKey PRIVATE_KEY = loadPrivateKey();
    private static final String ALGORITHM = "SHA256withRSA";

    /**
     * Generate license key
     */
    public String generateLicenseKey(LicenseData data) {
        try {
            // Create license data JSON
            String jsonData = objectMapper.writeValueAsString(data);

            // Sign license data
            Signature signature = Signature.getInstance(ALGORITHM);
            signature.initSign(PRIVATE_KEY);
            signature.update(jsonData.getBytes(StandardCharsets.UTF_8));
            byte[] signatureBytes = signature.sign();

            // Create license key structure
            LicenseKeyStructure keyStructure = new LicenseKeyStructure();
            keyStructure.setData(jsonData);
            keyStructure.setSignature(Base64.getEncoder().encodeToString(signatureBytes));

            // Encode license key
            String licenseKeyJson = objectMapper.writeValueAsString(keyStructure);
            return Base64.getEncoder().encodeToString(licenseKeyJson.getBytes(StandardCharsets.UTF_8));

        } catch (Exception e) {
            throw new LicenseKeyGenerationException("Failed to generate license key", e);
        }
    }
}
```

**License Key Validation (Application Side):**
```java
@Service
public class LicenseCryptoService {

    private static final PublicKey PUBLIC_KEY = loadPublicKey();
    private static final String ALGORITHM = "SHA256withRSA";

    /**
     * Validate license key signature
     */
    public boolean validateLicenseKey(String licenseKey, License license) {
        try {
            // Decode license key
            String licenseKeyJson = new String(
                Base64.getDecoder().decode(licenseKey), 
                StandardCharsets.UTF_8
            );
            LicenseKeyStructure keyStructure = objectMapper.readValue(
                licenseKeyJson, 
                LicenseKeyStructure.class
            );

            // Verify signature
            Signature signature = Signature.getInstance(ALGORITHM);
            signature.initVerify(PUBLIC_KEY);
            signature.update(keyStructure.getData().getBytes(StandardCharsets.UTF_8));
            
            byte[] signatureBytes = Base64.getDecoder().decode(keyStructure.getSignature());
            boolean isValid = signature.verify(signatureBytes);

            return isValid;

        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Hash license key (for storage)
     */
    public String hashLicenseKey(String licenseKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(licenseKey.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new LicenseCryptoException("Failed to hash license key", e);
        }
    }
}
```

---

## 3. Backup System

### 3.1 Automatic Scheduled Backups

#### 3.1.1 Backup Strategy

**Backup Types:**
- **Full Backup**: Complete database dump (daily)
- **Incremental Backup**: Changes since last backup (hourly, optional)
- **Transaction Log Backup**: WAL files (continuous, PostgreSQL)

**Backup Schedule:**
- **Full Backup**: Daily at 2:00 AM
- **Incremental Backup**: Every 6 hours (optional)
- **WAL Archiving**: Continuous (PostgreSQL)

**Backup Retention:**
- **Daily Backups**: 30 days
- **Weekly Backups**: 12 weeks
- **Monthly Backups**: 12 months

#### 3.1.2 Backup Service

**Location**: `com.jspcs.pos.service.backup.BackupService.java`

```java
@Service
public class BackupService {

    private final BackupMetadataRepository backupMetadataRepository;
    private final DatabaseBackupExecutor backupExecutor;
    private final BackupStorageService storageService;
    private final AuditLogService auditLogService;

    /**
     * Perform full backup
     */
    @Transactional
    public BackupMetadata performFullBackup(UUID userId) {
        Instant startTime = Instant.now();
        BackupMetadata metadata = new BackupMetadata();
        metadata.setId(UUID.randomUUID());
        metadata.setBackupType(BackupType.FULL);
        metadata.setBackupStartedAt(startTime);
        metadata.setBackupStatus(BackupStatus.IN_PROGRESS);
        metadata.setCreatedBy(userId);
        metadata = backupMetadataRepository.save(metadata);

        try {
            // 1. Generate backup file path
            String backupFileName = generateBackupFileName(BackupType.FULL);
            Path backupPath = storageService.getBackupPath().resolve(backupFileName);

            // 2. Execute database backup (pg_dump)
            backupExecutor.executeFullBackup(backupPath);

            // 3. Compress backup file (optional)
            Path compressedPath = compressBackup(backupPath);

            // 4. Verify backup file
            verifyBackupFile(compressedPath);

            // 5. Calculate backup size
            long backupSize = Files.size(compressedPath);

            // 6. Update metadata
            metadata.setBackupFilePath(compressedPath.toString());
            metadata.setBackupFileSize(backupSize);
            metadata.setBackupCompletedAt(Instant.now());
            metadata.setBackupStatus(BackupStatus.SUCCESS);
            metadata = backupMetadataRepository.save(metadata);

            // 7. Audit log
            auditLogService.log("BACKUP_CREATED", metadata.getId(), userId, Map.of(
                "backupType", BackupType.FULL.name(),
                "backupSize", backupSize,
                "backupPath", compressedPath.toString()
            ));

            // 8. Cleanup old backups
            cleanupOldBackups();

            return metadata;

        } catch (Exception e) {
            // Update metadata with error
            metadata.setBackupStatus(BackupStatus.FAILED);
            metadata.setErrorMessage(e.getMessage());
            metadata.setBackupCompletedAt(Instant.now());
            backupMetadataRepository.save(metadata);

            // Audit log
            auditLogService.log("BACKUP_FAILED", metadata.getId(), userId, Map.of(
                "error", e.getMessage()
            ));

            throw new BackupException("Backup failed", e);
        }
    }

    /**
     * Scheduled full backup (daily)
     */
    @Scheduled(cron = "0 0 2 * * *") // 2:00 AM daily
    public void scheduledFullBackup() {
        try {
            performFullBackup(null); // System backup
        } catch (Exception e) {
            log.error("Scheduled backup failed", e);
        }
    }

    /**
     * Generate backup filename
     */
    private String generateBackupFileName(BackupType type) {
        String timestamp = Instant.now().atZone(ZoneId.systemDefault())
            .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        return String.format("backup_%s_%s.sql", type.name().toLowerCase(), timestamp);
    }

    /**
     * Compress backup file
     */
    private Path compressBackup(Path backupPath) throws IOException {
        Path compressedPath = Paths.get(backupPath.toString() + ".gz");
        
        try (GZIPOutputStream gzipOut = new GZIPOutputStream(
            Files.newOutputStream(compressedPath)
        );
        Files.newInputStream(backupPath).transferTo(gzipOut)) {
            // Compression complete
        }

        // Delete uncompressed file
        Files.delete(backupPath);

        return compressedPath;
    }

    /**
     * Verify backup file
     */
    private void verifyBackupFile(Path backupPath) throws IOException {
        if (!Files.exists(backupPath)) {
            throw new BackupException("Backup file does not exist: " + backupPath);
        }

        if (Files.size(backupPath) == 0) {
            throw new BackupException("Backup file is empty: " + backupPath);
        }

        // Additional verification (e.g., check SQL syntax)
        // ...
    }

    /**
     * Cleanup old backups
     */
    private void cleanupOldBackups() {
        try {
            // Delete backups older than retention period
            Instant cutoffDate = Instant.now().minus(30, ChronoUnit.DAYS);
            
            List<BackupMetadata> oldBackups = backupMetadataRepository
                .findByBackupStartedAtBeforeAndBackupStatus(cutoffDate, BackupStatus.SUCCESS);

            for (BackupMetadata backup : oldBackups) {
                try {
                    // Delete backup file
                    Path backupPath = Paths.get(backup.getBackupFilePath());
                    if (Files.exists(backupPath)) {
                        Files.delete(backupPath);
                    }

                    // Delete metadata (or mark as deleted)
                    backupMetadataRepository.delete(backup);

                } catch (Exception e) {
                    log.error("Failed to cleanup backup: {}", backup.getId(), e);
                }
            }

        } catch (Exception e) {
            log.error("Backup cleanup failed", e);
        }
    }
}
```

#### 3.1.3 Database Backup Executor

**Location**: `com.jspcs.pos.service.backup.DatabaseBackupExecutor.java`

```java
@Component
public class DatabaseBackupExecutor {

    @Value("${spring.datasource.url}")
    private String databaseUrl;

    @Value("${spring.datasource.username}")
    private String databaseUsername;

    @Value("${spring.datasource.password}")
    private String databasePassword;

    /**
     * Execute PostgreSQL backup (pg_dump)
     */
    public void executeFullBackup(Path backupPath) throws IOException, InterruptedException {
        // Extract database name from URL
        String databaseName = extractDatabaseName(databaseUrl);

        // Build pg_dump command
        ProcessBuilder processBuilder = new ProcessBuilder(
            "pg_dump",
            "-h", extractHost(databaseUrl),
            "-p", String.valueOf(extractPort(databaseUrl)),
            "-U", databaseUsername,
            "-d", databaseName,
            "-F", "plain",  // Plain SQL format
            "-f", backupPath.toString()
        );

        // Set password via environment variable
        Map<String, String> environment = processBuilder.environment();
        environment.put("PGPASSWORD", databasePassword);

        // Execute backup
        Process process = processBuilder.start();

        // Wait for completion
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            String errorOutput = new String(process.getErrorStream().readAllBytes());
            throw new BackupException("pg_dump failed: " + errorOutput);
        }
    }

    private String extractDatabaseName(String url) {
        // Extract from jdbc:postgresql://host:port/database
        String[] parts = url.split("/");
        return parts[parts.length - 1].split("\\?")[0];
    }

    private String extractHost(String url) {
        // Extract from jdbc:postgresql://host:port/database
        String[] parts = url.split("//")[1].split(":");
        return parts[0];
    }

    private int extractPort(String url) {
        // Extract from jdbc:postgresql://host:port/database
        String[] parts = url.split("//")[1].split(":");
        if (parts.length > 1) {
            return Integer.parseInt(parts[1].split("/")[0]);
        }
        return 5432; // Default PostgreSQL port
    }
}
```

### 3.2 Manual USB Backup & Restore

#### 3.2.1 USB Backup Service

**Location**: `com.jspcs.pos.service.backup.UsbBackupService.java`

```java
@Service
public class UsbBackupService {

    private final BackupService backupService;
    private final UsbDeviceDetectionService usbService;
    private final AuditLogService auditLogService;

    /**
     * Create backup to USB drive
     */
    @Transactional
    public BackupMetadata createUsbBackup(UUID userId) {
        // 1. Detect USB drive
        Path usbPath = usbService.detectUsbDrive();
        if (usbPath == null) {
            throw new UsbDriveNotFoundException("USB drive not found");
        }

        // 2. Check USB drive space
        long availableSpace = usbService.getAvailableSpace(usbPath);
        long estimatedBackupSize = estimateBackupSize();
        if (availableSpace < estimatedBackupSize * 2) { // 2x safety margin
            throw new InsufficientSpaceException(
                "Insufficient space on USB drive. Required: " + estimatedBackupSize + 
                ", Available: " + availableSpace
            );
        }

        // 3. Create backup
        BackupMetadata backup = backupService.performFullBackup(userId);

        // 4. Copy backup to USB drive
        Path sourcePath = Paths.get(backup.getBackupFilePath());
        Path usbBackupPath = usbPath.resolve("jspcs-pos-backups")
            .resolve(sourcePath.getFileName());
        
        try {
            Files.createDirectories(usbBackupPath.getParent());
            Files.copy(sourcePath, usbBackupPath, StandardCopyOption.REPLACE_EXISTING);

            // 5. Create backup manifest
            createBackupManifest(usbBackupPath.getParent(), backup);

            // 6. Verify USB backup
            verifyUsbBackup(usbBackupPath);

            // 7. Audit log
            auditLogService.log("USB_BACKUP_CREATED", backup.getId(), userId, Map.of(
                "usbPath", usbBackupPath.toString()
            ));

            return backup;

        } catch (IOException e) {
            throw new UsbBackupException("Failed to copy backup to USB drive", e);
        }
    }

    /**
     * Restore backup from USB drive
     */
    @Transactional
    public void restoreFromUsb(UUID userId, String backupFileName) {
        // 1. Detect USB drive
        Path usbPath = usbService.detectUsbDrive();
        if (usbPath == null) {
            throw new UsbDriveNotFoundException("USB drive not found");
        }

        // 2. Find backup file
        Path backupPath = usbPath.resolve("jspcs-pos-backups").resolve(backupFileName);
        if (!Files.exists(backupPath)) {
            throw new BackupFileNotFoundException("Backup file not found: " + backupFileName);
        }

        // 3. Verify backup file
        verifyBackupFile(backupPath);

        // 4. Restore database (requires admin access)
        restoreDatabase(backupPath);

        // 5. Audit log
        auditLogService.log("USB_BACKUP_RESTORED", null, userId, Map.of(
            "backupFile", backupFileName,
            "usbPath", backupPath.toString()
        ));
    }

    /**
     * List available backups on USB drive
     */
    public List<UsbBackupInfo> listUsbBackups() {
        Path usbPath = usbService.detectUsbDrive();
        if (usbPath == null) {
            return Collections.emptyList();
        }

        Path backupDir = usbPath.resolve("jspcs-pos-backups");
        if (!Files.exists(backupDir)) {
            return Collections.emptyList();
        }

        try {
            return Files.list(backupDir)
                .filter(path -> path.toString().endsWith(".sql.gz"))
                .map(path -> {
                    try {
                        return UsbBackupInfo.builder()
                            .fileName(path.getFileName().toString())
                            .fileSize(Files.size(path))
                            .createdAt(Files.getLastModifiedTime(path).toInstant())
                            .build();
                    } catch (IOException e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        } catch (IOException e) {
            throw new UsbBackupException("Failed to list USB backups", e);
        }
    }
}
```

#### 3.2.2 USB Device Detection

**Location**: `com.jspcs.pos.service.backup.UsbDeviceDetectionService.java`

```java
@Service
public class UsbDeviceDetectionService {

    /**
     * Detect USB drive (platform-specific)
     */
    public Path detectUsbDrive() {
        String os = System.getProperty("os.name").toLowerCase();

        if (os.contains("win")) {
            return detectUsbDriveWindows();
        } else if (os.contains("linux")) {
            return detectUsbDriveLinux();
        } else if (os.contains("mac")) {
            return detectUsbDriveMac();
        }

        return null;
    }

    /**
     * Detect USB drive on Windows
     */
    private Path detectUsbDriveWindows() {
        // Check D: through Z: drives
        for (char drive = 'D'; drive <= 'Z'; drive++) {
            Path drivePath = Paths.get(drive + ":\\");
            if (Files.exists(drivePath)) {
                try {
                    // Check if it's a removable drive
                    FileStore store = Files.getFileStore(drivePath);
                    if (store.type().equals("FAT32") || store.type().equals("NTFS")) {
                        // Additional check: verify it's removable (optional)
                        return drivePath;
                    }
                } catch (IOException e) {
                    // Continue to next drive
                }
            }
        }
        return null;
    }

    /**
     * Detect USB drive on Linux
     */
    private Path detectUsbDriveLinux() {
        // Check /media and /mnt directories
        Path[] mountPoints = {
            Paths.get("/media"),
            Paths.get("/mnt"),
            Paths.get("/run/media")
        };

        for (Path mountPoint : mountPoints) {
            if (Files.exists(mountPoint)) {
                try {
                    // List mounted devices
                    List<Path> devices = Files.list(mountPoint)
                        .filter(Files::isDirectory)
                        .collect(Collectors.toList());

                    // Return first device (or implement better detection)
                    if (!devices.isEmpty()) {
                        return devices.get(0);
                    }
                } catch (IOException e) {
                    // Continue
                }
            }
        }
        return null;
    }

    /**
     * Get available space on USB drive
     */
    public long getAvailableSpace(Path usbPath) {
        try {
            FileStore store = Files.getFileStore(usbPath);
            return store.getUsableSpace();
        } catch (IOException e) {
            throw new UsbDriveException("Failed to get USB drive space", e);
        }
    }
}
```

---

## 4. Audit Logging

### 4.1 Audit Log Strategy

**Audit Log Fields** (already defined in schema):
- `user_id`: User who performed action
- `action`: Action type (CREATE, UPDATE, DELETE, LOGIN, etc.)
- `entity_type`: Entity type (PRODUCT, INVOICE, USER, etc.)
- `entity_id`: Entity ID
- `old_values`: Previous values (JSONB)
- `new_values`: New values (JSONB)
- `ip_address`: IP address
- `user_agent`: User agent
- `created_at`: Timestamp

### 4.2 Audit Log Service

**Location**: `com.jspcs.pos.service.audit.AuditLogService.java`

```java
@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final HttpServletRequest httpRequest;

    /**
     * Log audit event
     */
    @Transactional
    public void log(String action, UUID entityId, UUID userId) {
        log(action, entityType, entityId, userId, null, null);
    }

    /**
     * Log audit event with values
     */
    @Transactional
    public void log(String action, String entityType, UUID entityId, UUID userId,
                    Map<String, Object> oldValues, Map<String, Object> newValues) {
        AuditLog auditLog = new AuditLog();
        auditLog.setId(UUID.randomUUID());
        auditLog.setUserId(userId);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setOldValues(oldValues != null ? convertToJsonb(oldValues) : null);
        auditLog.setNewValues(newValues != null ? convertToJsonb(newValues) : null);
        auditLog.setIpAddress(getClientIpAddress());
        auditLog.setUserAgent(getUserAgent());
        auditLog.setCreatedAt(Instant.now());

        auditLogRepository.save(auditLog);
    }

    /**
     * Log audit event with metadata
     */
    @Transactional
    public void log(String action, UUID entityId, UUID userId, Map<String, Object> metadata) {
        AuditLog auditLog = new AuditLog();
        auditLog.setId(UUID.randomUUID());
        auditLog.setUserId(userId);
        auditLog.setAction(action);
        auditLog.setEntityType(extractEntityType(action));
        auditLog.setEntityId(entityId);
        auditLog.setNewValues(convertToJsonb(metadata));
        auditLog.setIpAddress(getClientIpAddress());
        auditLog.setUserAgent(getUserAgent());
        auditLog.setCreatedAt(Instant.now());

        auditLogRepository.save(auditLog);
    }

    private String getClientIpAddress() {
        if (httpRequest == null) return null;
        
        String xForwardedFor = httpRequest.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        return httpRequest.getRemoteAddr();
    }

    private String getUserAgent() {
        return httpRequest != null ? httpRequest.getHeader("User-Agent") : null;
    }

    private JsonNode convertToJsonb(Map<String, Object> values) {
        return objectMapper.valueToTree(values);
    }
}
```

### 4.3 Audit Log Integration

**AOP-Based Audit Logging:**

```java
@Aspect
@Component
public class AuditLogAspect {

    private final AuditLogService auditLogService;

    @AfterReturning(pointcut = "@annotation(auditable)", returning = "result")
    public void logAuditable(Auditable auditable, Object result) {
        // Extract entity information from result
        // Log audit event
        auditLogService.log(
            auditable.action(),
            auditable.entityType(),
            extractEntityId(result),
            getCurrentUserId()
        );
    }
}
```

**Annotation:**

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {
    String action();
    String entityType();
}
```

---

## 5. Security Measures

### 5.1 How Piracy is Mitigated

**Mechanisms:**
1. **License Key Encryption**: License keys are encrypted and signed
2. **Hardware Binding**: License bound to specific machine (MAC address)
3. **Offline Validation**: License validated locally (no online dependency)
4. **License Key Hashing**: License keys stored as hashes (cannot be extracted)
5. **Periodic Validation**: License validated periodically
6. **Counter Limits**: Enforcement of counter/user limits
7. **Audit Logging**: All license operations logged

**Piracy Prevention:**
- License keys cannot be easily copied (hardware binding)
- License keys cannot be shared (hardware-specific)
- License validation cannot be bypassed (offline validation)
- Counter limits cannot be exceeded (enforcement)

### 5.2 How Tampering is Mitigated

**Mechanisms:**
1. **Database Constraints**: Business rules enforced at database level
2. **Audit Logging**: Complete audit trail of all changes
3. **Soft Deletes**: Deleted records preserved (cannot be permanently removed)
4. **Transaction Logging**: Complete transaction history
5. **Data Integrity Checks**: Foreign keys, check constraints
6. **Access Control**: Role-based access control
7. **Input Validation**: All inputs validated

**Tampering Prevention:**
- Database constraints prevent invalid data
- Audit logs cannot be easily deleted (separate table)
- Soft deletes preserve audit trail
- Transactions logged in stock_movements
- Access control prevents unauthorized changes

### 5.3 How Data Loss is Mitigated

**Mechanisms:**
1. **Automatic Scheduled Backups**: Daily full backups
2. **Manual USB Backups**: On-demand USB backups
3. **Transaction Logging**: PostgreSQL WAL (Write-Ahead Logging)
4. **Backup Verification**: Backups verified before completion
5. **Backup Retention**: Multiple backup retention periods
6. **Recovery Procedures**: Complete recovery procedures
7. **Data Integrity**: Foreign keys, constraints, transactions

**Data Loss Prevention:**
- Daily backups ensure minimal data loss
- USB backups provide off-site backup
- WAL enables point-in-time recovery
- Backup verification ensures backup integrity
- Multiple retention periods provide recovery options

---

## Summary

This security, backup, and licensing design provides:

✅ **Offline License Validation**: Periodic validation with hardware binding  
✅ **Machine Binding**: MAC address/hardware fingerprint binding  
✅ **Counter-Based License Limits**: Enforcement of counter/user limits  
✅ **Automatic Scheduled Backups**: Daily full backups  
✅ **Manual USB Backup & Restore**: On-demand USB backup/restore  
✅ **Audit Logging**: Complete audit trail  
✅ **Piracy Mitigation**: License encryption, hardware binding, validation  
✅ **Tampering Mitigation**: Database constraints, audit logs, access control  
✅ **Data Loss Mitigation**: Automatic backups, USB backups, WAL, verification  

**Status:** ✅ Security, backup, and licensing design complete - Ready for implementation

