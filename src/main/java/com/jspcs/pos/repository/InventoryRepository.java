package com.jspcs.pos.repository;

import com.jspcs.pos.entity.product.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    @Query("SELECT i FROM Inventory i JOIN Product p ON i.productId = p.id " +
           "WHERE i.currentStock <= p.lowStockThreshold AND i.currentStock > 0 AND p.deletedAt IS NULL")
    List<Inventory> findLowStockItems();

    @Query("SELECT i FROM Inventory i JOIN Product p ON i.productId = p.id " +
           "WHERE i.currentStock = 0 AND p.deletedAt IS NULL")
    List<Inventory> findOutOfStockItems();

    @Query("SELECT COUNT(i) FROM Inventory i JOIN Product p ON i.productId = p.id " +
           "WHERE i.currentStock > 0 AND p.deletedAt IS NULL")
    long countProductsWithStock();

    @Query("SELECT COUNT(i) FROM Inventory i JOIN Product p ON i.productId = p.id " +
           "WHERE i.currentStock <= p.lowStockThreshold AND i.currentStock > 0 AND p.deletedAt IS NULL")
    long countLowStockProducts();

    @Query("SELECT COUNT(i) FROM Inventory i JOIN Product p ON i.productId = p.id " +
           "WHERE i.currentStock = 0 AND p.deletedAt IS NULL")
    long countOutOfStockProducts();
}
