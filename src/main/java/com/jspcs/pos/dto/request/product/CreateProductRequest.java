package com.jspcs.pos.dto.request.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProductRequest {
    @NotBlank(message = "SKU is required")
    private String sku;

    private String barcode;

    @NotBlank(message = "Name is required")
    private String name;

    private String description;
    private String category;
    private String brand;
    private String unitOfMeasure;

    @NotNull(message = "Selling price is required")
    @DecimalMin(value = "0.0", message = "Selling price cannot be negative")
    private BigDecimal sellingPrice;

    private BigDecimal costPrice;

    @NotNull(message = "GST rate is required")
    @DecimalMin(value = "0.0", message = "GST rate cannot be negative")
    private BigDecimal gstRate;

    private String hsnCode;
    private Boolean isTaxable;
    private Integer lowStockThreshold;
}
