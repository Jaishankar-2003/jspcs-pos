# Barcode Scanner & Thermal Printer Integration Summary
## JSPCS POS - Quick Reference Guide

---

## Architecture Overview

```
Browser (React)
  ├─> Barcode Scanner (USB HID Keyboard)
  │   └─> Input Event Capture
  │
  ├─> Thermal Printer
  │   └─> Server-Side Printing (Recommended)
  │       Backend → Print Service → Printer (USB/Serial)
  │
  └─> Cash Drawer (via Printer)
      └─> ESC/POS Command
```

---

## Barcode Scanner Integration

### How Barcode Input is Captured

**USB HID Keyboard Emulation:**
- USB barcode scanners appear as standard keyboards
- Simulate keyboard input when scanning
- Characters sent sequentially + Enter key
- No special drivers required

**Capture Strategy:**
1. **Dedicated Input Field** (Recommended)
   - Auto-focus input on page load
   - Capture all keyboard input
   - Detect Enter key (end of scan)
   - Timeout detection (100ms) for missing Enter

2. **Global Keyboard Listener** (Alternative)
   - Global keydown listener
   - Detect fast input patterns
   - Timeout-based detection

**Implementation:**
- Location: `src/features/cashier/hooks/useBarcodeScanner.js`
- Auto-focus on mount
- Enter key detection
- Timeout fallback (100ms)
- Clear input after scan

**Barcode Validation:**
- Minimum length: 8 characters
- Format validation (optional):
  - EAN-13: 13 digits
  - UPC-A: 12 digits
  - Code 128: Alphanumeric, 8+ characters

---

## Thermal Printer Integration

### Printing Approach: Server-Side Printing (Recommended)

**Architecture:**
```
Frontend → Backend API → Print Service (Local) → Printer (USB/Serial)
```

**Flow:**
1. Frontend requests print job
2. Backend generates ESC/POS commands
3. Backend sends commands to local print service
4. Print service sends to printer
5. Printer executes commands

**Advantages:**
- Works in any browser
- No special APIs needed
- Centralized command generation
- Cross-platform compatibility

**Components:**
- **PrintService**: Backend service for print operations
- **EscPosCommandGenerator**: ESC/POS command generation
- **PrintClientService**: Communication with local print service
- **Print Service Client**: Local service (Node.js/Python/Java) running on terminal

**ESC/POS Commands:**
- Initialize printer
- Set alignment (left/center/right)
- Print text
- Print line breaks
- Cut paper
- Open cash drawer

**Receipt Format:**
- Header (store name, address, GSTIN)
- Invoice details (number, date, cashier)
- Items (name, quantity, price, total)
- Totals (subtotal, discount, tax, grand total)
- Footer (thank you message)
- Paper cut

---

## Cash Drawer Integration

### Cash Drawer Trigger

**Method**: ESC/POS Command via Printer

**Commands (Printer-Specific):**
- **Epson**: `0x10, 0x14, 0x01, 0x00, 0x01` (DLE DC4)
- **Star Micronics**: `0x1B, 0x70, 0x00, 0x19, 0xFF` (ESC p)
- **Zebra**: `0x1B, 0x70, 0x00, 0x19, 0xFF` (ESC p)
- **Generic**: Varies by printer model

**Usage:**
- Triggered via print service
- Can be integrated with invoice printing
- Can be separate command
- Typically opens on cash payment

---

## Cross-Printer Compatibility

### ESC/POS Standard

**Supported Brands:**
- Epson (original)
- Star Micronics
- Zebra
- Bixolon
- Citizen
- BOCA
- And many others

**Common Commands:**
- Most commands are standard
- Some commands are brand-specific
- Cash drawer commands vary

### Printer Configuration

**Database Storage:**
- Printer model per counter
- Printer port (USB/Serial)
- Printer-specific settings (JSONB)

**Configuration Service:**
- Get printer config for counter
- Update printer configuration
- Printer-specific command selection

**Printer Detection:**
- Admin configuration UI
- Test print functionality
- Test cash drawer functionality

---

## Implementation Components

### Backend

**PrintService.java**
- Print invoice receipt
- Open cash drawer
- Generate print commands

**EscPosCommandGenerator.java**
- Generate invoice receipt commands
- Generate cash drawer commands
- Printer-specific command selection

**PrintClientService.java**
- Send print job to local service
- HTTP communication with print service

### Frontend

**useBarcodeScanner.js**
- Barcode input capture
- Auto-focus management
- Scan detection

**PrintButton.jsx**
- Print invoice button
- Print status handling

**PaymentPanel.jsx**
- Cash drawer trigger on cash payment

### Local Print Service

**print-client-service.js** (Node.js example)
- HTTP server (port 3001)
- Receives print commands
- Sends to printer via SerialPort
- Map counter IDs to printer ports

---

## Key Features

✅ **Barcode Scanner**: USB HID keyboard emulation, browser input capture  
✅ **Thermal Printer**: Server-side printing with ESC/POS commands  
✅ **Cash Drawer**: ESC/POS command via printer  
✅ **Cross-Printer**: Configuration and model-specific commands  
✅ **Browser-Based**: Works in any browser  
✅ **LAN-Based**: Local print service handles hardware  

---

## Best Practices

### Barcode Scanner
✅ Auto-focus input on page load  
✅ Use dedicated input field  
✅ Detect Enter key (end of scan)  
✅ Timeout fallback (100ms)  
✅ Clear input after scan  
✅ Validate barcode format  

### Thermal Printing
✅ Use server-side printing  
✅ Generate ESC/POS commands in backend  
✅ Use local print service/client  
✅ Handle print errors gracefully  
✅ Test printer configuration  
✅ Support multiple printer models  

### Cash Drawer
✅ Use ESC/POS commands  
✅ Printer-specific command selection  
✅ Test cash drawer functionality  
✅ Integrate with payment flow  

---

## Alternative Approaches (Not Recommended)

### Client-Side Printing
- **Method**: JavaScript ESC/POS library with WebUSB API
- **Limitations**: Limited browser support (Chrome/Edge only)
- **Complexity**: High
- **Recommendation**: Use server-side printing instead

---

## Summary

This hardware integration provides:

✅ **Barcode Input Capture**: USB HID keyboard emulation with browser input  
✅ **Server-Side Printing**: ESC/POS command generation and local print service  
✅ **Cash Drawer Integration**: ESC/POS command via printer  
✅ **Cross-Printer Compatibility**: Configuration and model-specific commands  
✅ **Browser-Based**: Works in any browser (no special APIs)  
✅ **LAN-Based**: Local print service handles hardware communication  

**Status:** ✅ Hardware integration design complete - Ready for implementation

