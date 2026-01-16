# Security, Backup & Licensing Summary
## JSPCS POS - Quick Reference Guide

---

## Licensing System

### Offline License Validation

**Validation Frequency:**
- On application start
- Periodic: Every 24 hours (configurable)
- Before critical operations (invoice creation, user creation)
- Grace period: 7 days offline

**Validation Process:**
1. Get active license
2. Check expiration date
3. Validate hardware binding (MAC address)
4. Validate license key signature
5. Check license limits (counters, users)

### Machine Binding

**Hardware Identification:**
- **Primary**: MAC address (primary network interface)
- **Fallback**: Hardware fingerprint (OS, processor, machine name)
- **Storage**: SHA-256 hash (not plain MAC address)

**Binding Process:**
1. Generate hardware ID (MAC address or fingerprint)
2. Hash hardware ID (SHA-256)
3. Store hash in license record
4. Validate on license check

### Counter-Based License Limits

**Enforcement Points:**
- Counter creation: Check max_counters
- User creation: Check max_users
- Periodic validation: Check limits

**Limit Types:**
- **TRIAL**: Limited counters/users
- **BASIC**: Moderate limits
- **PROFESSIONAL**: Higher limits
- **ENTERPRISE**: Unlimited (or very high limits)

### License Key Security

**License Key Structure:**
- Base64 encoded JSON
- Contains: license type, limits, dates
- RSA signature (SHA-256)
- Encrypted/hashed for storage

**Security Features:**
- License keys encrypted and signed
- Stored as hashes (cannot extract)
- Hardware binding (cannot share)
- Offline validation (cannot bypass)

---

## Backup System

### Automatic Scheduled Backups

**Backup Schedule:**
- **Full Backup**: Daily at 2:00 AM
- **Incremental Backup**: Every 6 hours (optional)
- **WAL Archiving**: Continuous (PostgreSQL)

**Backup Retention:**
- **Daily Backups**: 30 days
- **Weekly Backups**: 12 weeks
- **Monthly Backups**: 12 months

**Backup Process:**
1. Generate backup filename (timestamp)
2. Execute pg_dump (PostgreSQL)
3. Compress backup file (gzip)
4. Verify backup file
5. Store backup metadata
6. Cleanup old backups

### Manual USB Backup & Restore

**USB Backup Process:**
1. Detect USB drive
2. Check available space
3. Create full backup
4. Copy to USB drive
5. Create backup manifest
6. Verify USB backup

**USB Restore Process:**
1. Detect USB drive
2. List available backups
3. Select backup file
4. Verify backup file
5. Restore database
6. Verify restoration

**USB Detection:**
- **Windows**: Check D: through Z: drives
- **Linux**: Check /media, /mnt, /run/media
- **Mac**: Check /Volumes

---

## Audit Logging

### Audit Log Fields

- **user_id**: User who performed action
- **action**: Action type (CREATE, UPDATE, DELETE, LOGIN, etc.)
- **entity_type**: Entity type (PRODUCT, INVOICE, USER, etc.)
- **entity_id**: Entity ID
- **old_values**: Previous values (JSONB)
- **new_values**: New values (JSONB)
- **ip_address**: IP address
- **user_agent**: User agent
- **created_at**: Timestamp

### Logged Actions

**Authentication:**
- LOGIN, LOGOUT
- PASSWORD_CHANGE
- LICENSE_ACTIVATED

**Operations:**
- CREATE, UPDATE, DELETE (all entities)
- INVOICE_CREATE, INVOICE_CANCEL
- STOCK_ADJUSTMENT
- BACKUP_CREATED, BACKUP_RESTORED

**System:**
- LICENSE_VALIDATED
- LICENSE_EXPIRED
- LICENSE_LIMIT_EXCEEDED

---

## Security Measures

### How Piracy is Mitigated

**Mechanisms:**
1. **License Key Encryption**: Encrypted and signed keys
2. **Hardware Binding**: License bound to specific machine
3. **Offline Validation**: Validated locally (no bypass)
4. **License Key Hashing**: Stored as hashes (cannot extract)
5. **Periodic Validation**: Validated periodically
6. **Counter Limits**: Enforcement of limits
7. **Audit Logging**: All operations logged

**Prevention:**
- License keys cannot be copied (hardware binding)
- License keys cannot be shared (hardware-specific)
- License validation cannot be bypassed
- Counter limits cannot be exceeded

### How Tampering is Mitigated

**Mechanisms:**
1. **Database Constraints**: Business rules enforced
2. **Audit Logging**: Complete audit trail
3. **Soft Deletes**: Deleted records preserved
4. **Transaction Logging**: Complete transaction history
5. **Data Integrity Checks**: Foreign keys, constraints
6. **Access Control**: Role-based access
7. **Input Validation**: All inputs validated

**Prevention:**
- Database constraints prevent invalid data
- Audit logs cannot be easily deleted
- Soft deletes preserve audit trail
- Transactions logged in stock_movements
- Access control prevents unauthorized changes

### How Data Loss is Mitigated

**Mechanisms:**
1. **Automatic Scheduled Backups**: Daily full backups
2. **Manual USB Backups**: On-demand backups
3. **Transaction Logging**: PostgreSQL WAL
4. **Backup Verification**: Backups verified
5. **Backup Retention**: Multiple retention periods
6. **Recovery Procedures**: Complete recovery
7. **Data Integrity**: Foreign keys, constraints

**Prevention:**
- Daily backups ensure minimal data loss
- USB backups provide off-site backup
- WAL enables point-in-time recovery
- Backup verification ensures integrity
- Multiple retention periods provide options

---

## Key Features

### Licensing
✅ Offline license validation  
✅ Machine binding (MAC address)  
✅ Counter-based license limits  
✅ License key encryption  
✅ Periodic validation  
✅ Audit logging  

### Backup
✅ Automatic scheduled backups (daily)  
✅ Manual USB backup  
✅ USB restore  
✅ Backup verification  
✅ Backup retention (30 days daily, 12 weeks weekly, 12 months monthly)  
✅ Backup metadata tracking  

### Security
✅ Audit logging (all operations)  
✅ Database constraints  
✅ Soft deletes  
✅ Transaction logging  
✅ Access control  
✅ Input validation  

---

## Summary

This security, backup, and licensing design provides:

✅ **Offline License Validation**: Periodic validation with hardware binding  
✅ **Machine Binding**: MAC address/hardware fingerprint  
✅ **Counter-Based License Limits**: Enforcement of limits  
✅ **Automatic Scheduled Backups**: Daily full backups  
✅ **Manual USB Backup & Restore**: On-demand backup/restore  
✅ **Audit Logging**: Complete audit trail  
✅ **Piracy Mitigation**: License encryption, hardware binding, validation  
✅ **Tampering Mitigation**: Database constraints, audit logs, access control  
✅ **Data Loss Mitigation**: Automatic backups, USB backups, WAL, verification  

**Status:** ✅ Security, backup, and licensing design complete - Ready for implementation

