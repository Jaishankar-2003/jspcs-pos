package com.jspcs.pos.mapper;

import com.jspcs.pos.dto.response.sales.InvoiceItemResponse;
import com.jspcs.pos.dto.response.sales.InvoiceResponse;
import com.jspcs.pos.entity.sales.InvoiceItem;
import com.jspcs.pos.entity.sales.SalesInvoice;
import com.jspcs.pos.entity.user.CashierCounter;
import com.jspcs.pos.entity.user.User;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-01-16T13:02:41+0530",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.45.0.v20260101-2150, environment: Java 21.0.9 (Eclipse Adoptium)"
)
@Component
public class SalesInvoiceMapperImpl implements SalesInvoiceMapper {

    @Override
    public InvoiceResponse toResponse(SalesInvoice invoice) {
        if ( invoice == null ) {
            return null;
        }

        InvoiceResponse.InvoiceResponseBuilder invoiceResponse = InvoiceResponse.builder();

        invoiceResponse.cashierName( invoiceCashierFullName( invoice ) );
        invoiceResponse.counterName( invoiceCounterName( invoice ) );
        invoiceResponse.customerName( invoice.getCustomerName() );
        invoiceResponse.customerPhone( invoice.getCustomerPhone() );
        invoiceResponse.discountAmount( invoice.getDiscountAmount() );
        invoiceResponse.grandTotal( invoice.getGrandTotal() );
        invoiceResponse.id( invoice.getId() );
        invoiceResponse.invoiceDate( invoice.getInvoiceDate() );
        invoiceResponse.invoiceNumber( invoice.getInvoiceNumber() );
        invoiceResponse.invoiceTime( invoice.getInvoiceTime() );
        invoiceResponse.items( invoiceItemListToInvoiceItemResponseList( invoice.getItems() ) );
        invoiceResponse.paymentStatus( invoice.getPaymentStatus() );
        invoiceResponse.roundOff( invoice.getRoundOff() );
        invoiceResponse.subtotal( invoice.getSubtotal() );
        invoiceResponse.taxableAmount( invoice.getTaxableAmount() );
        invoiceResponse.totalTaxAmount( invoice.getTotalTaxAmount() );

        return invoiceResponse.build();
    }

    @Override
    public InvoiceItemResponse toItemResponse(InvoiceItem item) {
        if ( item == null ) {
            return null;
        }

        InvoiceItemResponse.InvoiceItemResponseBuilder invoiceItemResponse = InvoiceItemResponse.builder();

        invoiceItemResponse.cgstAmount( item.getCgstAmount() );
        invoiceItemResponse.discountAmount( item.getDiscountAmount() );
        invoiceItemResponse.finalAmount( item.getFinalAmount() );
        invoiceItemResponse.id( item.getId() );
        invoiceItemResponse.igstAmount( item.getIgstAmount() );
        invoiceItemResponse.lineNumber( item.getLineNumber() );
        invoiceItemResponse.productName( item.getProductName() );
        invoiceItemResponse.productSku( item.getProductSku() );
        invoiceItemResponse.quantity( item.getQuantity() );
        invoiceItemResponse.sgstAmount( item.getSgstAmount() );
        invoiceItemResponse.taxableAmount( item.getTaxableAmount() );
        invoiceItemResponse.totalTaxAmount( item.getTotalTaxAmount() );
        invoiceItemResponse.unitPrice( item.getUnitPrice() );

        return invoiceItemResponse.build();
    }

    private String invoiceCashierFullName(SalesInvoice salesInvoice) {
        if ( salesInvoice == null ) {
            return null;
        }
        User cashier = salesInvoice.getCashier();
        if ( cashier == null ) {
            return null;
        }
        String fullName = cashier.getFullName();
        if ( fullName == null ) {
            return null;
        }
        return fullName;
    }

    private String invoiceCounterName(SalesInvoice salesInvoice) {
        if ( salesInvoice == null ) {
            return null;
        }
        CashierCounter counter = salesInvoice.getCounter();
        if ( counter == null ) {
            return null;
        }
        String name = counter.getName();
        if ( name == null ) {
            return null;
        }
        return name;
    }

    protected List<InvoiceItemResponse> invoiceItemListToInvoiceItemResponseList(List<InvoiceItem> list) {
        if ( list == null ) {
            return null;
        }

        List<InvoiceItemResponse> list1 = new ArrayList<InvoiceItemResponse>( list.size() );
        for ( InvoiceItem invoiceItem : list ) {
            list1.add( toItemResponse( invoiceItem ) );
        }

        return list1;
    }
}
