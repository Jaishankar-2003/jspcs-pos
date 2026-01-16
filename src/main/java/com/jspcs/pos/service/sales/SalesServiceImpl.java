package com.jspcs.pos.service.sales;

import com.jspcs.pos.dto.request.sales.CreateInvoiceRequest;
import com.jspcs.pos.dto.request.sales.InvoiceItemRequest;
import com.jspcs.pos.dto.response.sales.InvoiceResponse;
import com.jspcs.pos.entity.product.Product;
import com.jspcs.pos.entity.sales.InvoiceItem;
import com.jspcs.pos.entity.sales.SalesInvoice;
import com.jspcs.pos.entity.user.User;
import com.jspcs.pos.exception.model.BusinessException;
import com.jspcs.pos.exception.model.EntityNotFoundException;
import com.jspcs.pos.mapper.SalesInvoiceMapper;
import com.jspcs.pos.repository.ProductRepository;
import com.jspcs.pos.repository.SalesInvoiceRepository;
import com.jspcs.pos.repository.UserRepository;
import com.jspcs.pos.service.inventory.IInventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SalesServiceImpl implements ISalesService {

        private final SalesInvoiceRepository invoiceRepository;
        private final ProductRepository productRepository;
        private final UserRepository userRepository; // To fetch cashier
        private final IInventoryService inventoryService;
        private final SalesInvoiceMapper invoiceMapper;

        @Override
        @Transactional
        public InvoiceResponse createInvoiceByUsername(CreateInvoiceRequest request, String username) {
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new EntityNotFoundException("User not found: " + username));
                return createInvoice(request, user.getId());
        }

        @Override
        @Transactional
        public InvoiceResponse createInvoice(CreateInvoiceRequest request, UUID cashierId) {
                User cashier = userRepository.findById(cashierId)
                                .orElseThrow(() -> new EntityNotFoundException("Cashier not found"));

                if (cashier.getCashierCounter() == null) {
                        throw new BusinessException("Cashier is not assigned to a counter", "NO_COUNTER_ASSIGNED");
                }

                SalesInvoice invoice = SalesInvoice.builder()
                                .invoiceNumber("INV-" + System.currentTimeMillis()) // Simple generation, should call
                                                                                    // sequence in real
                                                                                    // DB
                                .invoiceDate(LocalDate.now())
                                .invoiceTime(LocalTime.now())
                                .cashier(cashier)
                                .counter(cashier.getCashierCounter())
                                .customerName(request.getCustomerName())
                                .customerPhone(request.getCustomerPhone())
                                .customerEmail(request.getCustomerEmail())
                                .customerGstin(request.getCustomerGstin())
                                .items(new ArrayList<>())
                                .taxDetails(new ArrayList<>()) // Can be populated
                                .paymentStatus("PENDING")
                                .subtotal(BigDecimal.ZERO)
                                .discountAmount(BigDecimal.ZERO)
                                .taxableAmount(BigDecimal.ZERO)
                                .cgstAmount(BigDecimal.ZERO)
                                .sgstAmount(BigDecimal.ZERO)
                                .igstAmount(BigDecimal.ZERO)
                                .grandTotal(BigDecimal.ZERO)
                                .build();

                BigDecimal subtotal = BigDecimal.ZERO;
                BigDecimal totalTax = BigDecimal.ZERO;
                BigDecimal totalDiscount = BigDecimal.ZERO;

                for (InvoiceItemRequest itemRequest : request.getItems()) {
                        Product product = productRepository.findById(itemRequest.getProductId())
                                        .orElseThrow(() -> new EntityNotFoundException(
                                                        "Product not found: " + itemRequest.getProductId()));

                        // Stock Check
                        if (!inventoryService.hasSufficientStock(product.getId(), itemRequest.getQuantity())) {
                                throw new BusinessException("Insufficient stock for product: " + product.getName(),
                                                "INSUFFICIENT_STOCK");
                        }
                        // Deduct Stock
                        inventoryService.adjustStock(product.getId(), -itemRequest.getQuantity(),
                                        "Sales Invoice " + invoice.getInvoiceNumber(), "OUT", cashierId);

                        BigDecimal unitPrice = itemRequest.getUnitPrice() != null ? itemRequest.getUnitPrice()
                                        : product.getSellingPrice();
                        BigDecimal quantity = BigDecimal.valueOf(itemRequest.getQuantity());
                        BigDecimal lineTotal = unitPrice.multiply(quantity);

                        BigDecimal discountPercent = itemRequest.getDiscountPercent() != null
                                        ? itemRequest.getDiscountPercent()
                                        : BigDecimal.ZERO;
                        BigDecimal discountAmount = lineTotal.multiply(discountPercent).divide(BigDecimal.valueOf(100),
                                        2,
                                        RoundingMode.HALF_UP);

                        BigDecimal taxableInfo = lineTotal.subtract(discountAmount);

                        // Tax Calculation (Inclusive or Exclusive? Schema says gst_rate is on product.
                        // Usually retail is inclusive, but schema separates tax.
                        // Let's assume 'selling_price' is base or we calculate tax ON TOP of taxable
                        // amount.
                        // Schema: taxable_amount, cgst_amount, ...
                        // Let's assume Exclusive for simplicity of calculation: Total = Taxable + Tax.

                        BigDecimal gstRate = product.getGstRate();
                        BigDecimal taxAmount = taxableInfo.multiply(gstRate).divide(BigDecimal.valueOf(100), 2,
                                        RoundingMode.HALF_UP);

                        // Split CGST/SGST (assuming intra-state for now)
                        BigDecimal cgst = taxAmount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                        BigDecimal sgst = taxAmount.subtract(cgst); // Remainder to SGST
                        BigDecimal igst = BigDecimal.ZERO;

                        BigDecimal finalAmount = taxableInfo.add(taxAmount);

                        InvoiceItem item = InvoiceItem.builder()
                                        .invoice(invoice)
                                        .product(product)
                                        .lineNumber(invoice.getItems().size() + 1)
                                        .productName(product.getName())
                                        .productSku(product.getSku())
                                        .productBarcode(product.getBarcode())
                                        .unitPrice(unitPrice)
                                        .quantity(itemRequest.getQuantity())
                                        .discountPercent(discountPercent)
                                        .discountAmount(discountAmount)
                                        .lineTotal(lineTotal)
                                        .taxableAmount(taxableInfo)
                                        .gstRate(gstRate)
                                        .cgstAmount(cgst)
                                        .sgstAmount(sgst)
                                        .igstAmount(igst)
                                        .finalAmount(finalAmount)
                                        .build();

                        invoice.getItems().add(item);

                        subtotal = subtotal.add(lineTotal);
                        totalDiscount = totalDiscount.add(discountAmount);
                        totalTax = totalTax.add(taxAmount);
                }

                invoice.setSubtotal(subtotal);
                invoice.setDiscountAmount(totalDiscount);
                invoice.setTaxableAmount(subtotal.subtract(totalDiscount));
                // Distribute tax totals
                // Simplified: Sum of items.
                // In real world, we sum by tax rate for GstTaxDetails.
                BigDecimal totalCgst = invoice.getItems().stream().map(InvoiceItem::getCgstAmount).reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add);
                BigDecimal totalSgst = invoice.getItems().stream().map(InvoiceItem::getSgstAmount).reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add);
                invoice.setCgstAmount(totalCgst);
                invoice.setSgstAmount(totalSgst);

                BigDecimal grandTotal = subtotal.subtract(totalDiscount).add(totalCgst).add(totalSgst);
                invoice.setGrandTotal(grandTotal);

                invoice = invoiceRepository.save(invoice);

                return invoiceMapper.toResponse(invoice);
        }

        @Override
        @Transactional(readOnly = true)
        public InvoiceResponse getInvoice(UUID id) {
                SalesInvoice invoice = invoiceRepository.findById(id)
                                .orElseThrow(() -> new EntityNotFoundException("Invoice not found"));
                return invoiceMapper.toResponse(invoice);
        }

        @Override
        @Transactional(readOnly = true)
        public InvoiceResponse getInvoiceByNumber(String invoiceNumber) {
                SalesInvoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber)
                                .orElseThrow(() -> new EntityNotFoundException("Invoice not found"));
                return invoiceMapper.toResponse(invoice);
        }
}
