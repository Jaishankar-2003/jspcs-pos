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
    date = "2026-01-16T15:16:18+0530",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.2 (Eclipse Adoptium)"
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
        invoiceResponse.id( invoice.getId() );
        invoiceResponse.invoiceNumber( invoice.getInvoiceNumber() );
        invoiceResponse.invoiceDate( invoice.getInvoiceDate() );
        invoiceResponse.invoiceTime( invoice.getInvoiceTime() );
        invoiceResponse.customerName( invoice.getCustomerName() );
        invoiceResponse.customerPhone( invoice.getCustomerPhone() );
        invoiceResponse.subtotal( invoice.getSubtotal() );
        invoiceResponse.discountAmount( invoice.getDiscountAmount() );
        invoiceResponse.taxableAmount( invoice.getTaxableAmount() );
        invoiceResponse.totalTaxAmount( invoice.getTotalTaxAmount() );
        invoiceResponse.roundOff( invoice.getRoundOff() );
        invoiceResponse.grandTotal( invoice.getGrandTotal() );
        invoiceResponse.paymentStatus( invoice.getPaymentStatus() );
        invoiceResponse.items( invoiceItemListToInvoiceItemResponseList( invoice.getItems() ) );

        return invoiceResponse.build();
    }

    @Override
    public InvoiceItemResponse toItemResponse(InvoiceItem item) {
        if ( item == null ) {
            return null;
        }

        InvoiceItemResponse.InvoiceItemResponseBuilder invoiceItemResponse = InvoiceItemResponse.builder();

        invoiceItemResponse.id( item.getId() );
        invoiceItemResponse.lineNumber( item.getLineNumber() );
        invoiceItemResponse.productName( item.getProductName() );
        invoiceItemResponse.productSku( item.getProductSku() );
        invoiceItemResponse.unitPrice( item.getUnitPrice() );
        invoiceItemResponse.quantity( item.getQuantity() );
        invoiceItemResponse.discountAmount( item.getDiscountAmount() );
        invoiceItemResponse.taxableAmount( item.getTaxableAmount() );
        invoiceItemResponse.cgstAmount( item.getCgstAmount() );
        invoiceItemResponse.sgstAmount( item.getSgstAmount() );
        invoiceItemResponse.igstAmount( item.getIgstAmount() );
        invoiceItemResponse.totalTaxAmount( item.getTotalTaxAmount() );
        invoiceItemResponse.finalAmount( item.getFinalAmount() );

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
