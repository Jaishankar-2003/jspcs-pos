# Windows Deployment Strategy Summary
## JSPCS POS - Quick Reference Guide

---

## Architecture Overview

```
Admin Server (Windows PC)
├── Spring Boot (Windows Service)
├── PostgreSQL (Bundled, Windows Service)
└── Installation Directory

Cashier Terminals (Browser Only)
├── Chrome/Edge/Firefox
├── LAN Access
└── No Installation Required
```

---

## Deployment Components

### Admin Server
- Spring Boot Application (Windows Service via WinSW)
- PostgreSQL Database (Bundled, Windows Service)
- EXE Installer (Inno Setup)
- Update Service (Offline update mechanism)

### Cashier Terminals
- Web Browser (Chrome, Edge, Firefox)
- Network Access (LAN)
- No Installation Required

---

## Spring Boot Windows Service

### Technology
- **WinSW** (Windows Service Wrapper) - Recommended

### Service Configuration
- Service Name: JSPCS-POS-Server
- Display Name: JSPCS POS Server
- Startup Type: Automatic
- Dependencies: PostgreSQL service
- Log Directory: `C:\Program Files\JSPCS-POS\logs`

### Service Management
- Install: `install-service.bat`
- Start: `start-service.bat`
- Stop: `stop-service.bat`
- Restart: `restart-service.bat`
- Uninstall: `uninstall-service.bat`

---

## Bundled PostgreSQL

### Installation
- Included in installer package
- Silent installation mode
- Default Port: 5432
- Data Directory: `C:\ProgramData\JSPCS-POS\postgresql\data`
- Service Name: postgresql-x64-15

### Configuration
- Local-only access (localhost)
- UTF-8 encoding
- WAL enabled
- Logging enabled

---

## EXE Installer (Inno Setup)

### Installation Steps
1. Welcome screen
2. License agreement
3. PostgreSQL password configuration
4. Data directory selection
5. Installation directory selection
6. Additional icons (optional)
7. Installation progress
8. PostgreSQL installation
9. Database initialization
10. Service installation
11. Completion

### Installation Directory
- Default: `C:\Program Files\JSPCS-POS`
- Data: `C:\ProgramData\JSPCS-POS`

---

## Zero-Install Cashier Access

### Requirements
- Web browser (Chrome, Edge, Firefox)
- LAN network access
- No installation required

### Access URL
- `http://server-ip:8080`
- Example: `http://192.168.1.100:8080`

### Browser Configuration
- Enable JavaScript
- Enable Cookies
- Allow pop-ups (for invoice printing)

---

## Offline Update Mechanism

### Update Package Format
```
jspcs-pos-update-1.0.1.zip
├── update-info.json       (Update metadata)
├── files/                 (Updated files)
├── migrations/            (Database migrations)
└── update.bat             (Update script)
```

### Update Process
1. Download update package (USB or network)
2. Stop services
3. Backup current installation
4. Apply update files
5. Run database migrations (if needed)
6. Restart services
7. Verify update

### Update Script
- Location: `update.bat`
- Requires: Administrator privileges
- Process: Stop → Backup → Update → Migrate → Start → Verify

---

## Step-by-Step Installation Flow

### Pre-Installation
- [ ] Verify system requirements (Windows 10/11, 4GB RAM, 10GB disk)
- [ ] Ensure administrator privileges
- [ ] Check available disk space
- [ ] Verify network connectivity

### Installation Steps
1. Run installer (as Administrator)
2. Welcome screen → Next
3. License agreement → Accept → Next
4. PostgreSQL password → Enter password → Next
5. Data directory → Select → Next
6. Installation directory → Select → Next
7. Additional icons → Select → Next
8. Installation progress → Wait
9. PostgreSQL installation → Wait
10. Database initialization → Wait
11. Service installation → Wait
12. Firewall configuration → Allow access
13. Completion → Launch/Finish

### Post-Installation
1. Verify services are running
2. Access web interface (`http://localhost:8080`)
3. Check logs for errors
4. Login as Admin
5. Configure server IP
6. Configure firewall (if needed)
7. Activate license
8. Test cashier access

### Cashier Terminal Setup
1. Open browser (Chrome/Edge)
2. Navigate to `http://server-ip:8080`
3. Bookmark URL (optional)
4. Configure browser (pop-ups, cookies)
5. Test access

---

## Installation Directory Structure

```
C:\Program Files\JSPCS-POS\
├── bin\              (Executables, scripts)
├── lib\              (JAR files, dependencies)
├── config\           (Configuration files)
├── logs\             (Application logs)
├── backups\          (Database backups)
└── updates\          (Update packages)

C:\ProgramData\JSPCS-POS\
├── postgresql\data\  (Database files)
└── backups\          (Backup files)
```

---

## Network Configuration

### Admin Server
- Port 8080: HTTP (allow inbound)
- Port 8081: WebSocket (allow inbound)
- Port 5432: PostgreSQL (local only)

### Cashier Terminals
- Outbound access to server
- No inbound rules needed

### Firewall Rules
- Windows Firewall: Allow port 8080, 8081
- Router: No port forwarding needed (LAN only)

---

## Troubleshooting

### Installation Issues
- PostgreSQL fails → Check existing installation
- Service fails → Run as Administrator, check antivirus
- Port in use → Change port or stop conflicting service
- Database fails → Check password, verify permissions
- Firewall blocks → Configure Windows Firewall

### Runtime Issues
- Service won't start → Check logs, verify Java, check config
- Cannot access web → Verify service, check firewall, verify URL
- Database fails → Verify PostgreSQL service, check credentials

---

## Key Features

✅ **Spring Boot Windows Service**: WinSW-based service  
✅ **Bundled PostgreSQL**: Included in installer  
✅ **EXE Installer**: Inno Setup-based  
✅ **Zero-Install Cashier**: Browser-only access  
✅ **Offline Updates**: Manual update package system  
✅ **Complete Installation Flow**: Step-by-step procedure  

---

## Summary

This Windows deployment strategy provides:

✅ **Windows Service**: Spring Boot as Windows Service (WinSW)  
✅ **Bundled PostgreSQL**: Included in installer package  
✅ **EXE Installer**: Inno Setup-based installer with wizard  
✅ **Zero-Install Cashier**: Browser-only access (no installation)  
✅ **Offline Update Mechanism**: Manual update package system  
✅ **Step-by-Step Installation**: Complete installation procedure  
✅ **Service Management**: Scripts for service operations  
✅ **Network Configuration**: Firewall and network setup  

**Status:** ✅ Windows deployment design complete - Ready for implementation

