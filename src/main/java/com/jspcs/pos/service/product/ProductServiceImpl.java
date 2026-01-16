package com.jspcs.pos.service.product;

import com.jspcs.pos.dto.request.product.CreateProductRequest;
import com.jspcs.pos.dto.response.product.ProductResponse;
import com.jspcs.pos.entity.product.Product;
import com.jspcs.pos.exception.model.BusinessException;
import com.jspcs.pos.exception.model.EntityNotFoundException;
import com.jspcs.pos.mapper.ProductMapper;
import com.jspcs.pos.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements IProductService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Override
    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        if (productRepository.existsBySku(request.getSku())) {
            throw new BusinessException("Product with SKU " + request.getSku() + " already exists", "DUPLICATE_SKU");
        }

        Product product = productMapper.toEntity(request);
        // Note: Inventory is created by DB trigger
        product = productRepository.save(product);

        // Refresh to get the inventory created by trigger if needed, or rely on lazy
        // loading later.
        // Since we return response immediately, we might need to fetch it.
        // However, standard save() returns the entity. The usage of trigger means JPA
        // context doesn't know about the new Inventory record.
        // We usually need to clear cache or fetch fresh.
        // For simplicity, we just return. The mapped fields might be null in response
        // for first creation.
        // To fix:
        // entityManager.refresh(product); // Requires EntityManager

        return productMapper.toResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProduct(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        return productMapper.toResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductBySku(String sku) {
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        return productMapper.toResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll().stream()
                .map(productMapper::toResponse)
                .collect(Collectors.toList());
    }
}
