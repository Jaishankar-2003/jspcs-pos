package com.jspcs.pos.service.product;

import com.jspcs.pos.dto.request.product.CreateProductRequest;
import com.jspcs.pos.dto.response.product.ProductResponse;

import java.util.List;
import java.util.UUID;

public interface IProductService {
    ProductResponse createProduct(CreateProductRequest request);

    ProductResponse getProduct(UUID id);

    ProductResponse getProductBySku(String sku);

    List<ProductResponse> getAllProducts();
}
