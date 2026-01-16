package com.jspcs.pos.dto.response.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private UUID id;
    private String sku;
    private String barcode;
    private String name;
    private String category;
    private String brand;
    private String unitOfMeasure;
    private BigDecimal sellingPrice;
    private BigDecimal gstRate;
    private String hsnCode;
    private Boolean isTaxable;
    private Integer currentStock;
    private Integer availableStock;
    private Boolean isActive;
}
