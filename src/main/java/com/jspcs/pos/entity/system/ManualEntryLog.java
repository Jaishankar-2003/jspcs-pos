package com.jspcs.pos.entity.system;

import com.jspcs.pos.entity.base.AbstractEntity;
import com.jspcs.pos.entity.product.Product;
import com.jspcs.pos.entity.user.CashierCounter;
import com.jspcs.pos.entity.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "manual_entry_logs")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class ManualEntryLog extends AbstractEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashier_id", nullable = false)
    private User cashier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counter_id", nullable = false)
    private CashierCounter counter;

    @Column(name = "searched_value", nullable = false)
    private String searchedValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_product_id")
    private Product matchedProduct;

    @Column(nullable = false)
    private String action;

    @Column(name = "session_id")
    private UUID sessionId;
}
