package com.jspcs.pos.mapper;

import com.jspcs.pos.dto.request.product.CreateProductRequest;
import com.jspcs.pos.dto.response.product.ProductResponse;
import com.jspcs.pos.entity.product.Inventory;
import com.jspcs.pos.entity.product.Product;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-01-16T15:16:18+0530",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.2 (Eclipse Adoptium)"
)
@Component
public class ProductMapperImpl implements ProductMapper {

    @Override
    public Product toEntity(CreateProductRequest request) {
        if ( request == null ) {
            return null;
        }

        Product.ProductBuilder<?, ?> product = Product.builder();

        product.sku( request.getSku() );
        product.barcode( request.getBarcode() );
        product.name( request.getName() );
        product.description( request.getDescription() );
        product.category( request.getCategory() );
        product.brand( request.getBrand() );
        product.unitOfMeasure( request.getUnitOfMeasure() );
        product.sellingPrice( request.getSellingPrice() );
        product.costPrice( request.getCostPrice() );
        product.gstRate( request.getGstRate() );
        product.hsnCode( request.getHsnCode() );
        product.isTaxable( request.getIsTaxable() );
        product.lowStockThreshold( request.getLowStockThreshold() );

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
        productResponse.id( product.getId() );
        productResponse.sku( product.getSku() );
        productResponse.barcode( product.getBarcode() );
        productResponse.name( product.getName() );
        productResponse.category( product.getCategory() );
        productResponse.brand( product.getBrand() );
        productResponse.unitOfMeasure( product.getUnitOfMeasure() );
        productResponse.sellingPrice( product.getSellingPrice() );
        productResponse.costPrice( product.getCostPrice() );
        productResponse.gstRate( product.getGstRate() );
        productResponse.hsnCode( product.getHsnCode() );
        productResponse.isTaxable( product.getIsTaxable() );
        productResponse.isActive( product.getIsActive() );

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
