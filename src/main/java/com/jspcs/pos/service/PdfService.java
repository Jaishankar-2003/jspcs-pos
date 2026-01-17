package com.jspcs.pos.service;

import com.itextpdf.html2pdf.HtmlConverter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
@Slf4j
public class PdfService {

    public byte[] generateInvoicePdf(Map<String, Object> invoiceData) throws IOException {
        try {
            String htmlContent = generateInvoiceHtml(invoiceData);
            
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            HtmlConverter.convertToPdf(htmlContent, outputStream);
            
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF for invoice", e);
            throw new IOException("Failed to generate PDF", e);
        }
    }

    private String generateInvoiceHtml(Map<String, Object> invoiceData) {
        StringBuilder html = new StringBuilder();
        
        @SuppressWarnings("unchecked")
        Map<String, Object> invoice = (Map<String, Object>) invoiceData.get("invoice");
        
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> items = (java.util.List<Map<String, Object>>) invoiceData.get("items");

        html.append("<!DOCTYPE html>")
            .append("<html><head>")
            .append("<meta charset='UTF-8'>")
            .append("<style>")
            .append(getInvoiceStyles())
            .append("</style>")
            .append("</head><body>")
            .append("<div class='invoice'>")
            .append("<div class='header'>")
            .append("<h1>TAX INVOICE</h1>")
            .append("<div class='invoice-details'>")
            .append("<p><strong>Invoice No:</strong> ").append(invoice.get("invoiceNumber")).append("</p>")
            .append("<p><strong>Date:</strong> ").append(formatDate(invoice.get("invoiceDate"))).append("</p>")
            .append("<p><strong>Time:</strong> ").append(invoice.get("invoiceTime")).append("</p>")
            .append("</div>")
            .append("</div>");

        // Customer Details
        html.append("<div class='section'>")
            .append("<h2>Customer Details</h2>");
        
        String customerName = (String) invoice.get("customerName");
        if (customerName != null && !customerName.trim().isEmpty()) {
            html.append("<p><strong>Name:</strong> ").append(customerName).append("</p>");
        } else {
            html.append("<p><strong>Name:</strong> Cash Customer</p>");
        }
        
        String customerPhone = (String) invoice.get("customerPhone");
        if (customerPhone != null && !customerPhone.trim().isEmpty()) {
            html.append("<p><strong>Phone:</strong> ").append(customerPhone).append("</p>");
        }
        
        html.append("</div>");

        // Items Table
        html.append("<div class='section'>")
            .append("<h2>Items</h2>")
            .append("<table class='items-table'>")
            .append("<thead>")
            .append("<tr>")
            .append("<th>#</th>")
            .append("<th>Product</th>")
            .append("<th>SKU</th>")
            .append("<th>Qty</th>")
            .append("<th>Price</th>")
            .append("<th>Discount</th>")
            .append("<th>Tax</th>")
            .append("<th>Total</th>")
            .append("</tr>")
            .append("</thead>")
            .append("<tbody>");

        int lineNumber = 1;
        for (Map<String, Object> item : items) {
            html.append("<tr>")
                .append("<td>").append(lineNumber++).append("</td>")
                .append("<td>").append(item.get("productName")).append("</td>")
                .append("<td>").append(item.get("productSku")).append("</td>")
                .append("<td>").append(item.get("quantity")).append("</td>")
                .append("<td>₹").append(formatAmount(item.get("unitPrice"))).append("</td>")
                .append("<td>₹").append(formatAmount(item.get("discountAmount"))).append("</td>")
                .append("<td>₹").append(formatAmount(item.get("totalTaxAmount"))).append("</td>")
                .append("<td>₹").append(formatAmount(item.get("finalAmount"))).append("</td>")
                .append("</tr>");
        }

        html.append("</tbody></table></div>");

        // Summary
        html.append("<div class='summary'>")
            .append("<table class='summary-table'>")
            .append("<tr><td>Subtotal:</td><td>₹").append(formatAmount(invoice.get("subtotal"))).append("</td></tr>")
            .append("<tr><td>Discount:</td><td>₹").append(formatAmount(invoice.get("discountAmount"))).append("</td></tr>")
            .append("<tr><td>Taxable Amount:</td><td>₹").append(formatAmount(invoice.get("taxableAmount"))).append("</td></tr>")
            .append("<tr><td>CGST:</td><td>₹").append(formatAmount(invoice.get("cgstAmount"))).append("</td></tr>")
            .append("<tr><td>SGST:</td><td>₹").append(formatAmount(invoice.get("sgstAmount"))).append("</td></tr>")
            .append("<tr><td>IGST:</td><td>₹").append(formatAmount(invoice.get("igstAmount"))).append("</td></tr>");
        
        if (invoice.get("roundOff") != null && ((Number) invoice.get("roundOff")).doubleValue() != 0) {
            html.append("<tr><td>Round Off:</td><td>₹").append(formatAmount(invoice.get("roundOff"))).append("</td></tr>");
        }
        
        html.append("<tr class='total'><td><strong>Grand Total:</strong></td><td><strong>₹")
            .append(formatAmount(invoice.get("grandTotal"))).append("</strong></td></tr>")
            .append("</table></div>");

        // Footer
        html.append("<div class='footer'>")
            .append("<p>Thank you for your business!</p>")
            .append("<p>This is a computer-generated invoice and does not require signature.</p>")
            .append("</div>")
            .append("</div></body></html>");

        return html.toString();
    }

    private String getInvoiceStyles() {
        return """
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .invoice { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .invoice-details { text-align: left; margin-top: 20px; }
            .section { margin: 20px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; font-weight: bold; }
            .summary { margin: 20px 0; }
            .summary-table { width: 300px; margin-left: auto; }
            .summary-table td { padding: 5px; text-align: right; }
            .total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
            @media print { body { padding: 10px; } }
            """;
    }

    private String formatDate(Object date) {
        if (date == null) return "";
        return date.toString();
    }

    private String formatAmount(Object amount) {
        if (amount == null) return "0.00";
        return String.format("%.2f", ((Number) amount).doubleValue());
    }
}
