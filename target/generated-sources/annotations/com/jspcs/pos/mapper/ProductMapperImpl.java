package com.jspcs.pos.mapper;

import com.jspcs.pos.dto.request.product.CreateProductRequest;
import com.jspcs.pos.dto.response.product.ProductResponse;
import com.jspcs.pos.entity.product.Inventory;
import com.jspcs.pos.entity.product.Product;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-01-16T13:02:41+0530",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.45.0.v20260101-2150, environment: Java 21.0.9 (Eclipse Adoptium)"
)
@Component
public class ProductMapperImpl implements ProductMapper {

    @Override
    public Product toEntity(CreateProductRequest request) {
        if ( request == null ) {
            return null;
        }

        Product.ProductBuilder<?, ?> product = Product.builder();

        product.hsnCode( request.getHsnCode() );
        product.barcode( request.getBarcode() );
        product.brand( request.getBrand() );
        product.category( request.getCategory() );
        product.costPrice( request.getCostPrice() );
        product.description( request.getDescription() );
        product.gstRate( request.getGstRate() );
        product.isTaxable( request.getIsTaxable() );
        product.lowStockThreshold( request.getLowStockThreshold() );
        product.name( request.getName() );
        product.sellingPrice( request.getSellingPrice() );
        product.sku( request.getSku() );
        product.unitOfMeasure( request.getUnitOfMeasure() );

        return product.build();
    }

    @Override
    public ProductResponse toResponse(Product product) {
        if ( product == null ) {
            return null;
        }

        ProductResponse.ProductResponseBuilder productResponse = ProductResponse.builder();

        productResponse.currentStock( productInventoryCurrentStock( product ) );
        productResponse.availableStock( productInventoryAvailableStock( product ) );
        productResponse.barcode( product.getBarcode() );
        productResponse.brand( product.getBrand() );
        productResponse.category( product.getCategory() );
        productResponse.gstRate( product.getGstRate() );
        productResponse.hsnCode( product.getHsnCode() );
        productResponse.id( product.getId() );
        productResponse.isActive( product.getIsActive() );
        productResponse.isTaxable( product.getIsTaxable() );
        productResponse.name( product.getName() );
        productResponse.sellingPrice( product.getSellingPrice() );
        productResponse.sku( product.getSku() );
        productResponse.unitOfMeasure( product.getUnitOfMeasure() );

        return productResponse.build();
    }

    private Integer productInventoryCurrentStock(Product product) {
        if ( product == null ) {
            return null;
        }
        Inventory inventory = product.getInventory();
        if ( inventory == null ) {
            return null;
        }
        Integer currentStock = inventory.getCurrentStock();
        if ( currentStock == null ) {
            return null;
        }
        return currentStock;
    }

    private Integer productInventoryAvailableStock(Product product) {
        if ( product == null ) {
            return null;
        }
        Inventory inventory = product.getInventory();
        if ( inventory == null ) {
            return null;
        }
        Integer availableStock = inventory.getAvailableStock();
        if ( availableStock == null ) {
            return null;
        }
        return availableStock;
    }
}
