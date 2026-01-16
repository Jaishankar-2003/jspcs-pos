package com.jspcs.pos.entity.product;

import com.jspcs.pos.entity.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Inventory {

    @Id
    @Column(name = "product_id")
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "current_stock", nullable = false)
    private Integer currentStock;

    @Column(name = "reserved_stock", nullable = false)
    private Integer reservedStock;

    @Column(name = "available_stock", insertable = false, updatable = false)
    private Integer availableStock;

    @Column(name = "last_movement_at")
    private LocalDateTime lastMovementAt;

    @LastModifiedBy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_updated_by")
    private User lastUpdatedBy;

    @Version
    @Column(nullable = false)
    private Integer version;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
