package com.jspcs.pos.mapper;

import com.jspcs.pos.dto.request.product.CreateProductRequest;
import com.jspcs.pos.dto.response.product.ProductResponse;
import com.jspcs.pos.entity.product.Product;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProductMapper {
    @Mapping(target = "hsnCode", source = "hsnCode")
    Product toEntity(CreateProductRequest request);

    @Mapping(target = "currentStock", source = "inventory.currentStock")
    @Mapping(target = "availableStock", source = "inventory.availableStock")
    ProductResponse toResponse(Product product);
}
