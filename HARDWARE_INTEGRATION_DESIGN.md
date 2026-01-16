# Barcode Scanner & Thermal Printer Integration Design
## JSPCS POS - Hardware Device Integration

---

## 1. Architecture Overview

### 1.1 Hardware Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              HARDWARE INTEGRATION ARCHITECTURE               │
└─────────────────────────────────────────────────────────────┘

Browser (React Frontend)
│
├─> Barcode Scanner (USB HID Keyboard)
│   └─> Input Event Capture (JavaScript)
│       └─> Product Lookup & Add to Cart
│
├─> Thermal Printer (USB/USB-to-Serial)
│   ├─> Option 1: Server-Side Printing (Recommended)
│   │   ├─> Backend generates ESC/POS commands
│   │   ├─> Local Print Service receives commands
│   │   └─> Print Service sends to printer
│   │
│   └─> Option 2: Client-Side Printing (Alternative)
│       ├─> JavaScript ESC/POS library
│       ├─> WebUSB API (if supported)
│       └─> Direct printer communication
│
└─> Cash Drawer (via Printer)
    └─> Triggered via ESC/POS commands
        └─> Integrated with print job
```

### 1.2 Integration Approaches

**Barcode Scanner:**
- **Method**: USB HID Keyboard Emulation
- **Browser Support**: Native (standard input events)
- **Complexity**: Low (no special APIs needed)

**Thermal Printer:**
- **Method 1**: Server-Side Printing (Recommended)
  - Backend generates ESC/POS commands
  - Local print service/client receives commands
  - Prints via USB/Serial port
  
- **Method 2**: Client-Side Printing (Alternative)
  - JavaScript ESC/POS library (e.g., escpos-usb, node-thermal-printer)
  - Requires WebUSB API or local service
  - Limited browser support

**Cash Drawer:**
- **Method**: ESC/POS Command (via Printer)
- **Trigger**: Integrated with print job
- **Alternative**: Separate USB device (less common)

---

## 2. Barcode Scanner Integration

### 2.1 How Barcode Input is Captured

#### 2.1.1 USB Barcode Scanner Behavior

**USB HID Keyboard Emulation:**
- USB barcode scanners appear as standard keyboards
- When scanning, they simulate keyboard input
- Characters are sent sequentially (very fast)
- Typically ends with Enter/Return key
- No special drivers required

**Input Characteristics:**
- Speed: ~100-300 characters per second
- Pattern: Characters + Enter key
- Timing: Complete scan in < 100ms
- No focus required: Works with any focused input field

#### 2.1.2 Browser Input Capture Strategy

**Location**: `src/features/cashier/hooks/useBarcodeScanner.js`

**Approach 1: Dedicated Input Field (Recommended)**

```javascript
// Barcode input field always focused
// Captures all input, filters for barcode patterns
function useBarcodeScanner(onBarcodeScanned) {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Auto-focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }

    const handleKeyDown = (event) => {
      // Clear timeout on any key press
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Handle Enter key (end of scan)
      if (event.key === 'Enter' && barcode.trim()) {
        event.preventDefault();
        const scannedBarcode = barcode.trim();
        
        // Validate barcode format (optional)
        if (isValidBarcode(scannedBarcode)) {
          onBarcodeScanned(scannedBarcode);
        }
        
        // Clear input
        setBarcode('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }

      // Handle regular character input
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        setBarcode(prev => prev + event.key);
        
        // Set timeout to detect end of scan (if Enter not received)
        timeoutRef.current = setTimeout(() => {
          const scannedBarcode = barcode.trim();
          if (scannedBarcode.length >= 8) { // Minimum barcode length
            onBarcodeScanned(scannedBarcode);
            setBarcode('');
            if (inputRef.current) {
              inputRef.current.value = '';
            }
          }
        }, 100); // 100ms timeout
      }
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (input) {
        input.removeEventListener('keydown', handleKeyDown);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [barcode, onBarcodeScanned]);

  return { inputRef, barcode };
}
```

**Approach 2: Global Keyboard Listener (Alternative)**

```javascript
// Global listener captures all keyboard input
// Detects barcode scan patterns (fast input + Enter)
function useBarcodeScanner(onBarcodeScanned) {
  const scanBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const scanTimeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTimeRef.current;

      // If more than 50ms passed, treat as new scan
      if (timeSinceLastKey > 50) {
        scanBufferRef.current = '';
      }

      lastKeyTimeRef.current = currentTime;

      // Handle Enter key (end of scan)
      if (event.key === 'Enter') {
        event.preventDefault();
        const scannedBarcode = scanBufferRef.current.trim();
        
        if (scannedBarcode.length >= 8) {
          onBarcodeScanned(scannedBarcode);
        }
        
        scanBufferRef.current = '';
        return;
      }

      // Handle character input
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        scanBufferRef.current += event.key;
        
        // Clear timeout
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
        
        // Set timeout for end of scan detection
        scanTimeoutRef.current = setTimeout(() => {
          const scannedBarcode = scanBufferRef.current.trim();
          if (scannedBarcode.length >= 8) {
            onBarcodeScanned(scannedBarcode);
          }
          scanBufferRef.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [onBarcodeScanned]);

  return null;
}
```

**Recommendation**: Use Approach 1 (Dedicated Input Field) for better control and user experience.

#### 2.1.3 Component Integration

**Location**: `src/features/cashier/components/Billing/ProductSearchBar.jsx`

```javascript
function ProductSearchBar({ onProductFound, onManualSearch }) {
  const { inputRef, barcode } = useBarcodeScanner((scannedBarcode) => {
    handleBarcodeScan(scannedBarcode);
  });

  const handleBarcodeScan = async (barcode) => {
    try {
      // Search product by barcode
      const product = await productApi.findByBarcode(barcode);
      
      if (product) {
        onProductFound(product);
        // Auto-focus input for next scan
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else {
        // Product not found - show manual search
        onManualSearch(barcode);
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      // Show error notification
    }
  };

  return (
    <div className="barcode-input-container">
      <input
        ref={inputRef}
        type="text"
        placeholder="Scan barcode or type product code..."
        className="barcode-input"
        autoFocus
        // Hide input if desired (show only cursor)
        style={{ 
          position: 'absolute',
          left: '-9999px',
          opacity: 0
        }}
      />
      {/* Visual indicator that scanner is ready */}
      <div className="scanner-indicator">
        <span className="scanner-ready">Ready to scan</span>
      </div>
    </div>
  );
}
```

### 2.2 Barcode Format Validation

**Common Barcode Formats:**
- **UPC-A**: 12 digits
- **EAN-13**: 13 digits
- **Code 128**: Variable length (alphanumeric)
- **Code 39**: Variable length (alphanumeric + symbols)
- **Internal SKU**: Variable length (custom format)

**Validation Function:**

```javascript
function isValidBarcode(barcode) {
  // Minimum length check
  if (barcode.length < 8) {
    return false;
  }

  // Format validation (optional)
  // Example: EAN-13 (13 digits)
  const ean13Pattern = /^\d{13}$/;
  if (ean13Pattern.test(barcode)) {
    return true;
  }

  // Example: UPC-A (12 digits)
  const upcAPattern = /^\d{12}$/;
  if (upcAPattern.test(barcode)) {
    return true;
  }

  // Example: Code 128 (alphanumeric, 8+ characters)
  const code128Pattern = /^[A-Za-z0-9]{8,}$/;
  if (code128Pattern.test(barcode)) {
    return true;
  }

  // Internal SKU format (custom)
  // Add custom validation as needed

  return false;
}
```

### 2.3 Handling Manual Input vs Barcode Scan

**Differentiation Strategy:**

1. **Timing-Based Detection**:
   - Barcode scan: < 100ms for complete input
   - Manual typing: > 100ms between characters
   - Use timeout to detect end of scan

2. **Pattern-Based Detection**:
   - Barcode: Consistent length, specific format
   - Manual: Variable length, pauses between characters

3. **Focus-Based Detection**:
   - Barcode: Works even without focus (HID keyboard)
   - Manual: Requires focused input field

**Recommendation**: Use timing-based detection (Approach 1) for simplicity.

---

## 3. Thermal Printer Integration

### 3.1 Printing Approach

#### 3.1.1 Recommended: Server-Side Printing

**Architecture:**
```
Browser → Backend API → Print Service → Printer (USB/Serial)
```

**Flow:**
1. Frontend requests print job (invoice, receipt, etc.)
2. Backend generates ESC/POS commands
3. Backend sends commands to local print service/client
4. Print service receives commands via HTTP/WebSocket
5. Print service sends commands to printer (USB/Serial)
6. Printer executes commands (print receipt, open cash drawer)

**Advantages:**
- Works in any browser (no special APIs needed)
- Centralized print command generation
- Cross-platform compatibility
- Secure (no direct hardware access from browser)

**Disadvantages:**
- Requires local print service/client
- Network dependency (LAN required)

#### 3.1.2 Server-Side Printing Implementation

**Backend Print Service**

**Location**: `com.jspcs.pos.service.printing.PrintService.java`

```java
@Service
public class PrintService {

    private final InvoiceService invoiceService;
    private final PrintCommandGenerator commandGenerator;
    private final PrintClientService printClientService;

    /**
     * Print invoice receipt
     */
    public void printInvoice(UUID invoiceId, String counterId) {
        // Load invoice
        SalesInvoice invoice = invoiceService.getInvoice(invoiceId);
        
        // Generate ESC/POS commands
        byte[] printCommands = commandGenerator.generateInvoiceReceipt(invoice);
        
        // Send to print service client
        printClientService.sendPrintJob(counterId, printCommands);
    }

    /**
     * Open cash drawer (via printer)
     */
    public void openCashDrawer(String counterId) {
        // Generate cash drawer command
        byte[] command = commandGenerator.generateCashDrawerCommand();
        
        // Send to print service client
        printClientService.sendPrintJob(counterId, command);
    }
}
```

**ESC/POS Command Generator**

**Location**: `com.jspcs.pos.service.printing.EscPosCommandGenerator.java`

```java
@Service
public class EscPosCommandGenerator {

    /**
     * Generate invoice receipt commands
     */
    public byte[] generateInvoiceReceipt(SalesInvoice invoice) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        
        try {
            // Initialize printer
            output.write(ESC_POS_INIT);
            
            // Set alignment (center)
            output.write(ESC_POS_ALIGN_CENTER);
            
            // Print header
            output.write("=== STORE NAME ===\n".getBytes());
            output.write("Store Address\n".getBytes());
            output.write("Phone: 123-456-7890\n".getBytes());
            output.write("GSTIN: XX1234567890X\n".getBytes());
            output.write("---\n".getBytes());
            
            // Print invoice details
            output.write(ESC_POS_ALIGN_LEFT);
            output.write(String.format("Invoice: %s\n", invoice.getInvoiceNumber()).getBytes());
            output.write(String.format("Date: %s %s\n", invoice.getInvoiceDate(), invoice.getInvoiceTime()).getBytes());
            output.write(String.format("Cashier: %s\n", invoice.getCashier().getFullName()).getBytes());
            output.write("---\n".getBytes());
            
            // Print items
            for (InvoiceItem item : invoice.getItems()) {
                output.write(String.format("%s\n", item.getProductName()).getBytes());
                output.write(String.format("  %d x %s = %s\n", 
                    item.getQuantity(), 
                    formatCurrency(item.getUnitPrice()),
                    formatCurrency(item.getLineTotal())
                ).getBytes());
            }
            
            output.write("---\n".getBytes());
            
            // Print totals
            output.write(ESC_POS_ALIGN_RIGHT);
            output.write(String.format("Subtotal: %s\n", formatCurrency(invoice.getSubtotal())).getBytes());
            if (invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                output.write(String.format("Discount: -%s\n", formatCurrency(invoice.getDiscountAmount())).getBytes());
            }
            output.write(String.format("CGST: %s\n", formatCurrency(invoice.getCgstAmount())).getBytes());
            output.write(String.format("SGST: %s\n", formatCurrency(invoice.getSgstAmount())).getBytes());
            output.write(String.format("Total Tax: %s\n", formatCurrency(invoice.getTotalTaxAmount())).getBytes());
            output.write(String.format("GRAND TOTAL: %s\n", formatCurrency(invoice.getGrandTotal())).getBytes());
            
            // Print footer
            output.write(ESC_POS_ALIGN_CENTER);
            output.write("---\n".getBytes());
            output.write("Thank you for your purchase!\n".getBytes());
            output.write("---\n".getBytes());
            
            // Cut paper
            output.write(ESC_POS_CUT_PAPER);
            
            // Open cash drawer (optional, can be separate command)
            // output.write(ESC_POS_CASH_DRAWER);
            
        } catch (IOException e) {
            throw new PrintException("Failed to generate print commands", e);
        }
        
        return output.toByteArray();
    }

    /**
     * Generate cash drawer command
     */
    public byte[] generateCashDrawerCommand() {
        // ESC/POS command to open cash drawer
        // Different commands for different printer models
        return ESC_POS_CASH_DRAWER;
    }

    // ESC/POS command constants
    private static final byte[] ESC_POS_INIT = {0x1B, 0x40}; // ESC @
    private static final byte[] ESC_POS_ALIGN_LEFT = {0x1B, 0x61, 0x00}; // ESC a 0
    private static final byte[] ESC_POS_ALIGN_CENTER = {0x1B, 0x61, 0x01}; // ESC a 1
    private static final byte[] ESC_POS_ALIGN_RIGHT = {0x1B, 0x61, 0x02}; // ESC a 2
    private static final byte[] ESC_POS_CUT_PAPER = {0x1D, 0x56, 0x41, 0x00}; // GS V A 0
    private static final byte[] ESC_POS_CASH_DRAWER = {0x10, 0x14, 0x01, 0x00, 0x01}; // DLE DC4 (varies by printer)
}
```

**Print Client Service (Local Service)**

**Note**: This would be a separate local service/client application (Java, Node.js, Python, etc.) running on each cashier terminal.

**Example Structure** (Node.js client):

```javascript
// print-client-service.js
const express = require('express');
const SerialPort = require('serialport');

const app = express();
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// Map counter IDs to printer ports
const printerPorts = {
  'C001': 'COM3',  // Windows
  'C002': '/dev/ttyUSB0',  // Linux
  // ... other counters
};

app.post('/print/:counterId', (req, res) => {
  const counterId = req.params.counterId;
  const printCommands = req.body;
  
  const port = printerPorts[counterId];
  if (!port) {
    return res.status(404).send('Printer not found for counter');
  }
  
  // Send commands to printer
  const serialPort = new SerialPort(port, { baudRate: 9600 });
  
  serialPort.write(printCommands, (err) => {
    if (err) {
      console.error('Print error:', err);
      return res.status(500).send('Print failed');
    }
    
    serialPort.close();
    res.status(200).send('Print successful');
  });
});

app.listen(3001, () => {
  console.log('Print service running on port 3001');
});
```

**Backend Integration**

**Location**: `com.jspcs.pos.service.printing.PrintClientService.java`

```java
@Service
public class PrintClientService {

    private final RestTemplate restTemplate;
    
    @Value("${app.print.service.url:http://localhost:3001}")
    private String printServiceUrl;

    /**
     * Send print job to local print service
     */
    public void sendPrintJob(String counterId, byte[] commands) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            
            HttpEntity<byte[]> entity = new HttpEntity<>(commands, headers);
            
            String url = printServiceUrl + "/print/" + counterId;
            
            restTemplate.postForEntity(url, entity, String.class);
            
        } catch (Exception e) {
            throw new PrintException("Failed to send print job to local service", e);
        }
    }
}
```

**Frontend Integration**

**Location**: `src/features/cashier/hooks/usePrint.js`

```javascript
async function printInvoice(invoiceId) {
  try {
    const response = await fetch(`/api/cashier/invoices/${invoiceId}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Print failed');
    }
    
    // Print successful
    return true;
  } catch (error) {
    console.error('Print error:', error);
    throw error;
  }
}
```

#### 3.1.3 Alternative: Client-Side Printing (Limited Support)

**Approach**: JavaScript ESC/POS library with WebUSB API

**Limitations:**
- WebUSB API: Limited browser support (Chrome/Edge only)
- Requires user permission for USB device access
- Not suitable for all browsers

**Not Recommended**: Due to limited browser support and complexity.

---

## 4. Cash Drawer Integration

### 4.1 Cash Drawer Trigger

**Method**: ESC/POS Command via Printer

**Most thermal printers have a cash drawer connector that opens when receiving a specific ESC/POS command.**

**ESC/POS Cash Drawer Commands:**

Different printer models use different commands:

```
Epson ESC/POS:
  0x10, 0x14, 0x01, 0x00, 0x01  (DLE DC4)

Star Micronics:
  0x1B, 0x70, 0x00, 0x19, 0xFF  (ESC p)

Zebra:
  0x1B, 0x70, 0x00, 0x19, 0xFF  (ESC p)

Generic:
  Varies by printer model
```

**Implementation:**

**Location**: `com.jspcs.pos.service.printing.EscPosCommandGenerator.java`

```java
/**
 * Generate cash drawer command (printer-specific)
 */
public byte[] generateCashDrawerCommand(String printerModel) {
    // Default command (Epson)
    byte[] command = {0x10, 0x14, 0x01, 0x00, 0x01};
    
    // Printer-specific commands
    switch (printerModel.toUpperCase()) {
        case "EPSON":
            command = new byte[]{0x10, 0x14, 0x01, 0x00, 0x01};
            break;
        case "STAR":
            command = new byte[]{0x1B, 0x70, 0x00, 0x19, (byte)0xFF};
            break;
        case "ZEBRA":
            command = new byte[]{0x1B, 0x70, 0x00, 0x19, (byte)0xFF};
            break;
        default:
            // Use default (Epson)
            break;
    }
    
    return command;
}
```

**Usage:**

```java
// Open cash drawer
public void openCashDrawer(String counterId, String printerModel) {
    byte[] command = commandGenerator.generateCashDrawerCommand(printerModel);
    printClientService.sendPrintJob(counterId, command);
}

// Or integrate with invoice printing
public void printInvoiceAndOpenDrawer(UUID invoiceId, String counterId) {
    // Print invoice
    printInvoice(invoiceId, counterId);
    
    // Small delay
    Thread.sleep(500);
    
    // Open cash drawer
    openCashDrawer(counterId, getPrinterModel(counterId));
}
```

---

## 5. Cross-Printer Compatibility

### 5.1 ESC/POS Standard

**ESC/POS (Epson Standard Code for Point of Sale)** is the de facto standard for thermal printers.

**Supported Printer Brands:**
- Epson (original ESC/POS)
- Star Micronics
- Zebra
- Bixolon
- Citizen
- BOCA
- And many others

**Common Commands:**
- Most commands are standard across brands
- Some commands are brand-specific
- Cash drawer commands vary

### 5.2 Printer Detection & Configuration

**Database Configuration:**

```sql
-- Add printer configuration to cashier_counters table
ALTER TABLE cashier_counters ADD COLUMN printer_model VARCHAR(50);
ALTER TABLE cashier_counters ADD COLUMN printer_port VARCHAR(100);
ALTER TABLE cashier_counters ADD COLUMN printer_config JSONB;
```

**Printer Configuration Table:**

```sql
-- Printer configuration table
CREATE TABLE printer_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    counter_id UUID NOT NULL REFERENCES cashier_counters(id),
    printer_model VARCHAR(50) NOT NULL,
    printer_port VARCHAR(100) NOT NULL,
    printer_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Configuration Service:**

**Location**: `com.jspcs.pos.service.config.PrinterConfigService.java`

```java
@Service
public class PrinterConfigService {

    private final PrinterConfigRepository configRepository;

    /**
     * Get printer configuration for counter
     */
    public PrinterConfig getPrinterConfig(UUID counterId) {
        return configRepository.findByCounterId(counterId)
            .orElseThrow(() -> new EntityNotFoundException("Printer config", counterId));
    }

    /**
     * Update printer configuration
     */
    public PrinterConfig updatePrinterConfig(UUID counterId, PrinterConfig config) {
        PrinterConfig existing = configRepository.findByCounterId(counterId)
            .orElse(new PrinterConfig());
        
        existing.setCounterId(counterId);
        existing.setPrinterModel(config.getPrinterModel());
        existing.setPrinterPort(config.getPrinterPort());
        existing.setPrinterConfig(config.getPrinterConfig());
        
        return configRepository.save(existing);
    }
}
```

**Printer-Specific Command Selection:**

```java
@Service
public class EscPosCommandGenerator {

    /**
     * Get cash drawer command for printer model
     */
    public byte[] getCashDrawerCommand(String printerModel) {
        // Map printer models to commands
        Map<String, byte[]> commands = Map.of(
            "EPSON", new byte[]{0x10, 0x14, 0x01, 0x00, 0x01},
            "STAR", new byte[]{0x1B, 0x70, 0x00, 0x19, (byte)0xFF},
            "ZEBRA", new byte[]{0x1B, 0x70, 0x00, 0x19, (byte)0xFF},
            "BIXOLON", new byte[]{0x10, 0x14, 0x01, 0x00, 0x01}
        );
        
        return commands.getOrDefault(printerModel.toUpperCase(), 
            commands.get("EPSON")); // Default to Epson
    }

    /**
     * Generate invoice receipt with printer-specific settings
     */
    public byte[] generateInvoiceReceipt(SalesInvoice invoice, PrinterConfig config) {
        // Use printer-specific configuration
        // Adjust commands based on printer model
        // ...
    }
}
```

### 5.3 Printer Testing & Validation

**Printer Test Endpoint:**

```java
@RestController
@RequestMapping("/api/admin/printers")
public class PrinterTestController {

    private final PrintService printService;

    /**
     * Test printer
     */
    @PostMapping("/{counterId}/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> testPrinter(@PathVariable UUID counterId) {
        try {
            // Generate test print
            byte[] testCommands = generateTestPrint();
            
            // Send to printer
            printService.sendPrintJob(counterId, testCommands);
            
            return ResponseEntity.ok("Test print sent successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Test print failed: " + e.getMessage());
        }
    }

    /**
     * Test cash drawer
     */
    @PostMapping("/{counterId}/test-drawer")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> testCashDrawer(@PathVariable UUID counterId) {
        try {
            printService.openCashDrawer(counterId);
            return ResponseEntity.ok("Cash drawer opened successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Cash drawer test failed: " + e.getMessage());
        }
    }
}
```

---

## 6. Frontend Integration

### 6.1 Print Button Component

**Location**: `src/features/cashier/components/Invoice/PrintButton.jsx`

```javascript
function PrintButton({ invoiceId }) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printApi.printInvoice(invoiceId);
      // Show success notification
    } catch (error) {
      // Show error notification
      console.error('Print error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting}
      className="print-button"
    >
      {isPrinting ? 'Printing...' : 'Print Receipt'}
    </button>
  );
}
```

### 6.2 Cash Drawer Trigger

**Location**: `src/features/cashier/components/Payment/PaymentPanel.jsx`

```javascript
function PaymentPanel({ onPaymentProcessed }) {
  const handlePayment = async (paymentMode, amount) => {
    try {
      // Process payment
      await paymentApi.processPayment(invoiceId, paymentMode, amount);
      
      // Open cash drawer (if cash payment)
      if (paymentMode === 'CASH') {
        await printApi.openCashDrawer(counterId);
      }
      
      onPaymentProcessed();
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <div className="payment-panel">
      {/* Payment UI */}
      <button onClick={() => handlePayment('CASH', amount)}>
        Cash Payment
      </button>
    </div>
  );
}
```

---

## Summary

This hardware integration design provides:

✅ **Barcode Scanner Integration**: USB HID keyboard emulation with browser input capture  
✅ **Thermal Printer Integration**: Server-side printing with ESC/POS command generation  
✅ **Cash Drawer Integration**: ESC/POS command via printer  
✅ **Cross-Printer Compatibility**: Printer configuration and model-specific command selection  
✅ **Browser-Based**: Works in any browser (no special APIs required)  
✅ **LAN-Based**: Local print service/client handles hardware communication  

**Status:** ✅ Hardware integration design complete - Ready for implementation

