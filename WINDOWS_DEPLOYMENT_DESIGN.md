# Windows Deployment Strategy Design
## JSPCS POS - Windows-Based Deployment

---

## 1. Architecture Overview

### 1.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              WINDOWS DEPLOYMENT ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Admin Server (Windows PC)                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Windows Service (JSPCS POS Server)         │    │
│  │  - Spring Boot Application                         │    │
│  │  - Port: 8080 (HTTP), 8081 (WebSocket)            │    │
│  │  - Service Name: JSPCS POS Server                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         PostgreSQL (Bundled)                       │    │
│  │  - Port: 5432 (default)                            │    │
│  │  - Data Directory: C:\ProgramData\JSPCS-POS\data  │    │
│  │  - Service Name: postgresql-x64-XX                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Installation Directory                      │    │
│  │  C:\Program Files\JSPCS-POS\                       │    │
│  │  ├── bin\          (Executables)                   │    │
│  │  ├── lib\          (JAR files, dependencies)       │    │
│  │  ├── config\       (Configuration files)           │    │
│  │  ├── data\         (Database files)                │    │
│  │  ├── logs\         (Application logs)              │    │
│  │  ├── backups\      (Database backups)              │    │
│  │  └── updates\      (Update packages)                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Windows Firewall Rules                     │    │
│  │  - Port 8080: Inbound (HTTP)                       │    │
│  │  - Port 8081: Inbound (WebSocket)                  │    │
│  │  - Port 5432: Local only (PostgreSQL)              │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ LAN (HTTP/WebSocket)
                            │
            ┌───────────────┴───────────────┐
            │                               │
    ┌───────▼────────┐            ┌────────▼────────┐
    │  Cashier PC 1  │            │  Cashier PC 2   │
    │   (Browser)    │            │   (Browser)     │
    │                │            │                 │
    │  Chrome/Edge   │            │  Chrome/Edge    │
    │  http://       │            │  http://        │
    │  server-ip:    │            │  server-ip:     │
    │  8080          │            │  8080           │
    └────────────────┘            └─────────────────┘
```

### 1.2 Deployment Components

**Admin Server Components:**
- Spring Boot Application (Windows Service)
- PostgreSQL Database (Bundled, Windows Service)
- Installation Package (EXE/MSI)
- Update Service (Offline update mechanism)

**Cashier Terminal Components:**
- Web Browser (Chrome, Edge, Firefox)
- Network Access (LAN connection)
- No Installation Required

---

## 2. Spring Boot Windows Service

### 2.1 Service Implementation Strategy

**Technology Options:**
1. **WinSW (Windows Service Wrapper)** - Recommended
2. **NSSM (Non-Sucking Service Manager)** - Alternative
3. **Apache Commons Daemon** - Alternative
4. **Java Service Wrapper** - Commercial option

**Recommendation**: WinSW (Windows Service Wrapper)
- Open source
- Easy to configure
- Good documentation
- Lightweight

### 2.2 WinSW Configuration

**Service Configuration File**: `jspcs-pos-server.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<service>
    <id>JSPCS-POS-Server</id>
    <name>JSPCS POS Server</name>
    <description>JSPCS POS - Offline LAN-based Retail Billing System</description>
    
    <!-- Executable -->
    <executable>java</executable>
    
    <!-- Java Arguments -->
    <arguments>
        -Xmx2048m
        -Xms512m
        -XX:+UseG1GC
        -Djava.awt.headless=true
        -Dfile.encoding=UTF-8
        -Duser.timezone=Asia/Kolkata
        -jar "%BASE%\lib\jspcs-pos-server.jar"
        --spring.config.location=file:"%BASE%\config\application.properties"
        --logging.config=file:"%BASE%\config\logback.xml"
    </arguments>
    
    <!-- Working Directory -->
    <workingdirectory>%BASE%\bin</workingdirectory>
    
    <!-- Log Directory -->
    <logpath>%BASE%\logs</logpath>
    <logmode>roll</logmode>
    <depend>postgresql-x64-15</depend>
    
    <!-- Startup Type -->
    <startmode>Automatic</startmode>
    
    <!-- On Failure Action -->
    <onfailure action="restart" delay="10 sec"/>
    <onfailure action="restart" delay="20 sec"/>
    <onfailure action="reboot" delay="30 sec"/>
    
    <!-- Stop Timeout -->
    <stoptimeout>30 sec</stoptimeout>
    
    <!-- Service Account -->
    <serviceaccount>
        <domain>NT AUTHORITY</domain>
        <user>LocalSystem</user>
    </serviceaccount>
</service>
```

### 2.3 Service Installation Script

**Location**: `install-service.bat`

```batch
@echo off
setlocal enabledelayedexpansion

set SERVICE_NAME=JSPCS-POS-Server
set SERVICE_DISPLAY_NAME=JSPCS POS Server
set BASE_DIR=%~dp0
set WINSW_EXE=%BASE_DIR%bin\winsw.exe
set SERVICE_XML=%BASE_DIR%bin\jspcs-pos-server.xml

echo Installing JSPCS POS Server as Windows Service...

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    pause
    exit /b 1
)

REM Install service
"%WINSW_EXE%" install "%SERVICE_XML%"

if %errorLevel% equ 0 (
    echo Service installed successfully
    echo Starting service...
    net start "%SERVICE_NAME%"
    if %errorLevel% equ 0 (
        echo Service started successfully
    ) else (
        echo ERROR: Failed to start service
    )
) else (
    echo ERROR: Failed to install service
)

pause
```

### 2.4 Service Management Scripts

**Start Service**: `start-service.bat`
```batch
@echo off
net start "JSPCS-POS-Server"
pause
```

**Stop Service**: `stop-service.bat`
```batch
@echo off
net stop "JSPCS-POS-Server"
pause
```

**Restart Service**: `restart-service.bat`
```batch
@echo off
net stop "JSPCS-POS-Server"
timeout /t 5
net start "JSPCS-POS-Server"
pause
```

**Uninstall Service**: `uninstall-service.bat`
```batch
@echo off
net stop "JSPCS-POS-Server"
"%BASE_DIR%bin\winsw.exe" uninstall "%BASE_DIR%bin\jspcs-pos-server.xml"
pause
```

---

## 3. Bundled PostgreSQL

### 3.1 PostgreSQL Bundling Strategy

**Approach**: Include PostgreSQL installation in the installer package

**PostgreSQL Options:**
1. **PostgreSQL Portable**: Portable version (simpler, but limited)
2. **PostgreSQL Installer**: Include installer in package (recommended)
3. **Pre-installed PostgreSQL**: Require separate installation (not recommended)

**Recommendation**: Include PostgreSQL installer in package

### 3.2 PostgreSQL Installation

**Installation Directory**: `C:\Program Files\PostgreSQL\15` (or user-specified)

**Service Name**: `postgresql-x64-15` (or version-specific)

**Data Directory**: `C:\ProgramData\JSPCS-POS\postgresql\data`

**Port**: 5432 (default, configurable)

### 3.3 PostgreSQL Configuration

**PostgreSQL Configuration File**: `postgresql.conf`

```conf
# Network Configuration
listen_addresses = 'localhost'
port = 5432

# Data Directory
data_directory = 'C:\ProgramData\JSPCS-POS\postgresql\data'

# Memory Configuration
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
work_mem = 16MB

# WAL Configuration
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB

# Logging
logging_collector = on
log_directory = 'C:\Program Files\JSPCS-POS\logs\postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 10MB

# Locale
lc_messages = 'en_US.UTF-8'
lc_monetary = 'en_US.UTF-8'
lc_numeric = 'en_US.UTF-8'
lc_time = 'en_US.UTF-8'
default_text_search_config = 'pg_catalog.english'
```

**Authentication Configuration**: `pg_hba.conf`

```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Local connections (from Spring Boot application)
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
```

### 3.4 PostgreSQL Database Initialization

**Initialization Script**: `init-database.bat`

```batch
@echo off
setlocal

set PG_INSTALL_DIR=C:\Program Files\PostgreSQL\15
set PG_BIN_DIR=%PG_INSTALL_DIR%\bin
set DATA_DIR=C:\ProgramData\JSPCS-POS\postgresql\data
set DB_NAME=jspcs_pos
set DB_USER=jspcs_pos
set DB_PASSWORD=%~1

REM Initialize database directory
"%PG_BIN_DIR%\initdb.exe" -D "%DATA_DIR%" -U postgres --locale=C --encoding=UTF8

REM Start PostgreSQL service
net start postgresql-x64-15
timeout /t 5

REM Create database
"%PG_BIN_DIR%\psql.exe" -U postgres -c "CREATE DATABASE %DB_NAME%;"

REM Create user
"%PG_BIN_DIR%\psql.exe" -U postgres -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';"

REM Grant privileges
"%PG_BIN_DIR%\psql.exe" -U postgres -d %DB_NAME% -c "GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;"

REM Run schema script
"%PG_BIN_DIR%\psql.exe" -U postgres -d %DB_NAME% -f "%BASE_DIR%\schema.sql"

echo Database initialized successfully
```

---

## 4. EXE / MSI Installer

### 4.1 Installer Technology Options

**Options:**
1. **Inno Setup** - Recommended (Free, powerful, Windows-focused)
2. **NSIS (Nullsoft Scriptable Install System)** - Alternative
3. **WiX Toolset** - MSI-based (Professional, complex)
4. **InstallShield** - Commercial (Expensive, feature-rich)

**Recommendation**: Inno Setup for EXE installer (simpler, easier to use)

### 4.2 Inno Setup Script

**Location**: `installer.iss`

```inno
[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName=JSPCS POS
AppVersion=1.0.0
AppPublisher=JSPCS Software
AppPublisherURL=https://www.jspcs.com
AppSupportURL=https://www.jspcs.com/support
AppUpdatesURL=https://www.jspcs.com/updates
DefaultDirName={autopf}\JSPCS-POS
DefaultGroupName=JSPCS POS
AllowNoIcons=yes
LicenseFile=license.txt
InfoBeforeFile=readme.txt
OutputDir=dist
OutputBaseFilename=jspcs-pos-installer
SetupIconFile=icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1

[Files]
Source: "bin\*"; DestDir: "{app}\bin"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "lib\*"; DestDir: "{app}\lib"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "config\*"; DestDir: "{app}\config"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "postgresql-installer.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall
Source: "winsw.exe"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: "schema.sql"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\JSPCS POS Server"; Filename: "{app}\bin\start-service.bat"
Name: "{group}\JSPCS POS Web"; Filename: "http://localhost:8080"; IconFilename: "{app}\bin\icon.ico"
Name: "{group}\{cm:UninstallProgram,JSPCS POS}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\JSPCS POS Web"; Filename: "http://localhost:8080"; Tasks: desktopicon

[Run]
Filename: "{tmp}\postgresql-installer.exe"; Parameters: "--mode unattended --superpassword {code:GetPostgresPassword} --servicename postgresql-x64-15 --servicepassword {code:GetPostgresPassword} --datadir {code:GetDataDir}"; StatusMsg: "Installing PostgreSQL..."; Flags: runhidden waituntilterminated
Filename: "{app}\bin\init-database.bat"; Parameters: "{code:GetPostgresPassword}"; StatusMsg: "Initializing database..."; Flags: runhidden waituntilterminated
Filename: "{app}\bin\install-service.bat"; StatusMsg: "Installing Windows Service..."; Flags: runhidden waituntilterminated
Filename: "http://localhost:8080"; Description: "{cm:LaunchProgram,JSPCS POS}"; Flags: postinstall skipifsilent shellexec

[Code]
var
  PostgresPasswordPage: TInputQueryWizardPage;
  DataDirPage: TInputDirWizardPage;

procedure InitializeWizard;
begin
  PostgresPasswordPage := CreateInputQueryPage(wpWelcome,
    'PostgreSQL Configuration', 'Enter PostgreSQL password',
    'Please enter the password for the PostgreSQL database user:');
  PostgresPasswordPage.Add('Password:', False);

  DataDirPage := CreateInputDirWizardPage(wpSelectDir,
    'Data Directory', 'Select data directory',
    'Please select the directory for database files:', False, '');
  DataDirPage.Add('');
end;

function GetPostgresPassword(Param: String): String;
begin
  Result := PostgresPasswordPage.Values[0];
end;

function GetDataDir(Param: String): String;
begin
  Result := DataDirPage.Values[0];
end;
```

### 4.3 Installer Features

**Installation Steps:**
1. Welcome screen
2. License agreement
3. PostgreSQL password configuration
4. Data directory selection
5. Installation directory selection
6. Additional icons (desktop, quick launch)
7. Installation progress
8. PostgreSQL installation
9. Database initialization
10. Service installation
11. Completion

**Installer Components:**
- Application files (bin, lib, config)
- PostgreSQL installer
- WinSW (Windows Service Wrapper)
- Database schema script
- Configuration files
- Documentation

---

## 5. Zero-Install Cashier Access

### 5.1 Browser-Only Access

**Strategy**: Cashier terminals access the system via web browser only

**Requirements:**
- Web browser (Chrome, Edge, Firefox)
- LAN network access to server
- No installation required

### 5.2 Browser Configuration

**Recommended Browsers:**
- **Chrome/Edge**: Recommended (best compatibility)
- **Firefox**: Supported
- **Safari**: Not recommended (limited support)

**Browser Settings:**
- Enable JavaScript
- Enable Cookies
- Allow pop-ups (for invoice printing)
- Clear cache periodically (optional)

### 5.3 Network Access

**Server Discovery:**
- Static IP address (recommended)
- Hostname resolution (optional)
- mDNS/Bonjour (optional, complex)

**Access URL:**
- `http://server-ip:8080` (primary)
- `http://server-hostname:8080` (if hostname configured)
- `http://localhost:8080` (server machine only)

**Network Configuration:**
- Windows Firewall: Allow inbound on port 8080, 8081
- Router: No port forwarding needed (LAN only)
- Network: All cashier PCs on same LAN

---

## 6. Offline Update Mechanism

### 6.1 Update Strategy

**Approach**: Manual offline update package

**Update Package Contents:**
- Updated JAR files
- Updated configuration files
- Database migration scripts (if needed)
- Update script/instructions

**Update Process:**
1. Download update package (USB or network)
2. Stop services (Spring Boot, PostgreSQL)
3. Backup current installation
4. Apply update files
5. Run database migrations (if needed)
6. Restart services
7. Verify update

### 6.2 Update Service

**Location**: `com.jspcs.pos.service.update.UpdateService.java`

```java
@Service
public class UpdateService {

    private final BackupService backupService;
    private final UpdatePackageService packageService;
    private final DatabaseMigrationService migrationService;

    /**
     * Apply update package
     */
    @Transactional
    public UpdateResult applyUpdate(String updatePackagePath, UUID userId) {
        try {
            // 1. Validate update package
            UpdatePackage updatePackage = packageService.validatePackage(updatePackagePath);

            // 2. Create backup before update
            BackupMetadata backup = backupService.performFullBackup(userId);

            // 3. Extract update package
            Path extractPath = packageService.extractPackage(updatePackagePath);

            // 4. Stop services (via service management)
            stopServices();

            try {
                // 5. Backup current files
                backupCurrentFiles();

                // 6. Apply update files
                applyUpdateFiles(extractPath);

                // 7. Run database migrations (if needed)
                if (updatePackage.hasMigrations()) {
                    migrationService.runMigrations(updatePackage.getMigrations());
                }

                // 8. Restart services
                startServices();

                // 9. Verify update
                verifyUpdate(updatePackage.getVersion());

                // 10. Update version info
                updateVersionInfo(updatePackage.getVersion());

                return UpdateResult.success(updatePackage.getVersion());

            } catch (Exception e) {
                // Rollback on error
                rollbackUpdate();
                throw new UpdateException("Update failed, rolled back", e);
            }

        } catch (Exception e) {
            throw new UpdateException("Update failed", e);
        }
    }

    /**
     * Stop services
     */
    private void stopServices() {
        try {
            Runtime.getRuntime().exec("net stop \"JSPCS-POS-Server\"");
            // Wait for service to stop
            Thread.sleep(5000);
        } catch (Exception e) {
            throw new UpdateException("Failed to stop service", e);
        }
    }

    /**
     * Start services
     */
    private void startServices() {
        try {
            Runtime.getRuntime().exec("net start \"JSPCS-POS-Server\"");
            // Wait for service to start
            Thread.sleep(10000);
        } catch (Exception e) {
            throw new UpdateException("Failed to start service", e);
        }
    }
}
```

### 6.3 Update Package Format

**Update Package Structure:**
```
jspcs-pos-update-1.0.1.zip
├── update-info.json       (Update metadata)
├── files/                 (Updated files)
│   ├── lib/
│   │   └── jspcs-pos-server.jar
│   └── config/
│       └── application.properties
├── migrations/            (Database migrations, if any)
│   └── V1.0.1__update.sql
└── update.bat             (Update script)
```

**Update Info JSON:**
```json
{
  "version": "1.0.1",
  "previousVersion": "1.0.0",
  "releaseDate": "2024-01-01",
  "changelog": "Bug fixes and improvements",
  "requiresBackup": true,
  "hasMigrations": true,
  "critical": false
}
```

### 6.4 Update Script

**Update Script**: `update.bat`

```batch
@echo off
setlocal enabledelayedexpansion

set UPDATE_PACKAGE=%~1
set BASE_DIR=%~dp0

echo ========================================
echo JSPCS POS Update Script
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    pause
    exit /b 1
)

REM Extract update package
echo Extracting update package...
powershell -command "Expand-Archive -Path '%UPDATE_PACKAGE%' -DestinationPath '%BASE_DIR%\update-temp' -Force"

REM Stop services
echo Stopping services...
net stop "JSPCS-POS-Server"
timeout /t 5

REM Backup current installation
echo Creating backup...
call "%BASE_DIR%\bin\backup.bat"

REM Apply update files
echo Applying update files...
xcopy "%BASE_DIR%\update-temp\files\*" "%BASE_DIR%\" /E /Y /I

REM Run database migrations (if needed)
if exist "%BASE_DIR%\update-temp\migrations\*.sql" (
    echo Running database migrations...
    call "%BASE_DIR%\bin\run-migrations.bat" "%BASE_DIR%\update-temp\migrations"
)

REM Start services
echo Starting services...
net start "JSPCS-POS-Server"
timeout /t 10

REM Cleanup
echo Cleaning up...
rmdir /s /q "%BASE_DIR%\update-temp"

echo.
echo Update completed successfully!
pause
```

---

## 7. Step-by-Step Installation Flow

### 7.1 Pre-Installation Requirements

**System Requirements:**
- Windows 10/11 (64-bit) or Windows Server 2016/2019/2022
- Minimum 4 GB RAM (8 GB recommended)
- Minimum 10 GB free disk space
- Administrator privileges
- Network adapter (for LAN access)

**Pre-Installation Checklist:**
- [ ] Verify system requirements
- [ ] Ensure administrator privileges
- [ ] Check available disk space
- [ ] Verify network connectivity
- [ ] Close any running PostgreSQL instances (if any)
- [ ] Backup existing data (if upgrading)

### 7.2 Installation Steps

#### Step 1: Run Installer

1. **Download installer** (EXE file)
2. **Right-click installer** → Run as Administrator
3. **Windows UAC prompt** → Click "Yes"

#### Step 2: Welcome Screen

1. **Welcome screen** appears
2. Click **"Next"** to continue

#### Step 3: License Agreement

1. **License agreement** displayed
2. Read license terms
3. Select **"I accept the agreement"**
4. Click **"Next"**

#### Step 4: PostgreSQL Password Configuration

1. **PostgreSQL password page** appears
2. Enter **PostgreSQL password** (secure password, minimum 8 characters)
3. Confirm password (if required)
4. Click **"Next"**

**Note**: Save this password securely - required for database access

#### Step 5: Data Directory Selection

1. **Data directory page** appears
2. Select directory for database files (default: `C:\ProgramData\JSPCS-POS\postgresql\data`)
3. Ensure sufficient disk space (minimum 5 GB)
4. Click **"Next"**

#### Step 6: Installation Directory Selection

1. **Installation directory page** appears
2. Select directory for application files (default: `C:\Program Files\JSPCS-POS`)
3. Click **"Next"**

#### Step 7: Additional Icons (Optional)

1. **Additional icons page** appears
2. Select **"Create desktop icon"** (optional)
3. Select **"Create quick launch icon"** (optional, Windows 7 only)
4. Click **"Next"**

#### Step 8: Installation Progress

1. **Installation progress** screen appears
2. Files are copied to installation directory
3. Wait for installation to complete

#### Step 9: PostgreSQL Installation

1. **PostgreSQL installer** runs automatically (silent mode)
2. PostgreSQL is installed to `C:\Program Files\PostgreSQL\15`
3. Wait for PostgreSQL installation to complete

#### Step 10: Database Initialization

1. **Database initialization** runs automatically
2. Database schema is created
3. Initial data is loaded (if any)
4. Wait for database initialization to complete

#### Step 11: Windows Service Installation

1. **Windows Service installation** runs automatically
2. JSPCS POS Server service is installed
3. Service is started automatically
4. Wait for service to start

#### Step 12: Firewall Configuration

1. **Windows Firewall** may prompt for permission
2. Click **"Allow access"** for JSPCS POS Server
3. Allow for both **Private** and **Public** networks (recommend Private only)

#### Step 13: Completion

1. **Completion screen** appears
2. Options:
   - **"Launch JSPCS POS"**: Opens browser to `http://localhost:8080`
   - **"Show readme file"**: Opens readme file
3. Click **"Finish"**

### 7.3 Post-Installation Steps

#### Step 14: Verify Installation

1. **Check Windows Services**:
   - Open Services (services.msc)
   - Verify "JSPCS POS Server" is running
   - Verify "PostgreSQL" service is running

2. **Access Web Interface**:
   - Open browser
   - Navigate to `http://localhost:8080`
   - Verify login page appears

3. **Check Logs**:
   - Navigate to `C:\Program Files\JSPCS-POS\logs`
   - Verify application.log exists
   - Check for any errors

#### Step 15: Initial Configuration

1. **Login as Admin**:
   - Default credentials (if any): Check documentation
   - Change default password immediately

2. **Configure Server IP**:
   - Note server IP address (for cashier access)
   - Configure static IP if needed

3. **Configure Windows Firewall** (if needed):
   - Allow inbound connections on port 8080
   - Allow inbound connections on port 8081 (WebSocket)

4. **Test Cashier Access**:
   - From another PC on LAN
   - Navigate to `http://server-ip:8080`
   - Verify access works

#### Step 16: License Activation

1. **Activate License**:
   - Login as Admin
   - Navigate to Settings → License
   - Enter license key
   - Activate license

2. **Verify License**:
   - Check license status
   - Verify counter/user limits

### 7.4 Cashier Terminal Setup

#### Step 17: Cashier PC Configuration

**No Installation Required** - Browser only access

1. **Open Browser**:
   - Recommended: Chrome or Edge
   - Firefox also supported

2. **Navigate to Server**:
   - Enter URL: `http://server-ip:8080`
   - Example: `http://192.168.1.100:8080`

3. **Bookmark URL** (Optional):
   - Add bookmark for easy access
   - Pin to taskbar (Chrome/Edge)

4. **Configure Browser** (Optional):
   - Enable pop-ups (for invoice printing)
   - Allow cookies
   - Disable extensions (if causing issues)

#### Step 18: Network Configuration

1. **Verify Network Connectivity**:
   - Ping server from cashier PC
   - Verify port 8080 is accessible

2. **Configure Firewall** (if needed):
   - Allow outbound connections
   - No inbound rules needed (cashier PC)

3. **Test Access**:
   - Open browser
   - Navigate to server URL
   - Verify login page appears

---

## 8. Installation Directory Structure

### 8.1 Final Directory Structure

```
C:\Program Files\JSPCS-POS\
├── bin\
│   ├── winsw.exe                    (Windows Service Wrapper)
│   ├── jspcs-pos-server.xml         (Service configuration)
│   ├── install-service.bat          (Service installation)
│   ├── start-service.bat            (Start service)
│   ├── stop-service.bat             (Stop service)
│   ├── restart-service.bat          (Restart service)
│   ├── uninstall-service.bat        (Uninstall service)
│   ├── init-database.bat            (Database initialization)
│   ├── backup.bat                   (Backup script)
│   └── update.bat                   (Update script)
│
├── lib\
│   ├── jspcs-pos-server.jar         (Main application JAR)
│   └── [dependencies]                (All JAR dependencies)
│
├── config\
│   ├── application.properties       (Application configuration)
│   ├── logback.xml                  (Logging configuration)
│   └── database.properties          (Database configuration)
│
├── logs\
│   ├── application.log              (Application logs)
│   ├── error.log                    (Error logs)
│   └── postgresql\                  (PostgreSQL logs)
│
├── backups\
│   └── [backup files]               (Database backups)
│
├── updates\
│   └── [update packages]            (Update packages)
│
└── schema.sql                        (Database schema)

C:\ProgramData\JSPCS-POS\
├── postgresql\
│   └── data\                        (PostgreSQL data files)
│
└── backups\                         (Backup files)
```

---

## 9. Troubleshooting

### 9.1 Common Installation Issues

**Issue**: PostgreSQL installation fails
- **Solution**: Check if PostgreSQL is already installed, uninstall if needed

**Issue**: Service installation fails
- **Solution**: Ensure running as Administrator, check antivirus software

**Issue**: Port 8080 already in use
- **Solution**: Change port in configuration or stop conflicting service

**Issue**: Database initialization fails
- **Solution**: Check PostgreSQL password, verify data directory permissions

**Issue**: Firewall blocks access
- **Solution**: Configure Windows Firewall to allow port 8080, 8081

### 9.2 Common Runtime Issues

**Issue**: Service won't start
- **Solution**: Check logs, verify Java installation, check configuration files

**Issue**: Cannot access web interface
- **Solution**: Verify service is running, check firewall, verify URL

**Issue**: Database connection fails
- **Solution**: Verify PostgreSQL service is running, check credentials

---

## Summary

This Windows deployment strategy provides:

✅ **Spring Boot Windows Service**: WinSW-based service implementation  
✅ **Bundled PostgreSQL**: Included in installer package  
✅ **EXE Installer**: Inno Setup-based installer  
✅ **Zero-Install Cashier Access**: Browser-only access (no installation)  
✅ **Offline Update Mechanism**: Manual update package system  
✅ **Step-by-Step Installation Flow**: Complete installation procedure  

**Status:** ✅ Windows deployment design complete - Ready for implementation

