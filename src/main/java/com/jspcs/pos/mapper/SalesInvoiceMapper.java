package com.jspcs.pos.mapper;

import com.jspcs.pos.dto.response.sales.InvoiceItemResponse;
import com.jspcs.pos.dto.response.sales.InvoiceResponse;
import com.jspcs.pos.entity.sales.InvoiceItem;
import com.jspcs.pos.entity.sales.SalesInvoice;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SalesInvoiceMapper {
    @Mapping(target = "cashierName", source = "cashier.fullName")
    @Mapping(target = "counterName", source = "counter.name")
    InvoiceResponse toResponse(SalesInvoice invoice);

    InvoiceItemResponse toItemResponse(InvoiceItem item);
}
