package com.jspcs.pos.entity.product;

import com.jspcs.pos.entity.base.VersionedEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Product extends VersionedEntity {

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(unique = true)
    private String barcode;

    @Column(nullable = false)
    private String name;

    private String description;

    private String category;

    private String brand;

    @Column(name = "unit_of_measure")
    private String unitOfMeasure;

    @Column(name = "selling_price", nullable = false)
    private BigDecimal sellingPrice;

    @Column(name = "cost_price")
    private BigDecimal costPrice;

    @Column(name = "gst_rate", nullable = false)
    private BigDecimal gstRate;

    @Column(name = "hsn_code")
    private String hsnCode;

    @Column(name = "is_taxable")
    private Boolean isTaxable;

    @Column(name = "low_stock_threshold")
    private Integer lowStockThreshold;

    @OneToOne(mappedBy = "product", fetch = FetchType.LAZY)
    private Inventory inventory;
}
