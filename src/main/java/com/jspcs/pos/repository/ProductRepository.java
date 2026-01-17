package com.jspcs.pos.repository;

import com.jspcs.pos.entity.product.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    Optional<Product> findBySku(String sku);

    Optional<Product> findByBarcode(String barcode);

    boolean existsBySku(String sku);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.deletedAt IS NULL")
    long countActiveProducts();
}
