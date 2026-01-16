package com.jspcs.pos.entity.user;

import com.jspcs.pos.entity.base.SoftDeletableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "cashier_counters")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class CashierCounter extends SoftDeletableEntity {

    @Column(name = "counter_number", nullable = false, unique = true)
    private String counterNumber;

    @Column(nullable = false)
    private String name;

    private String location;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.INET)
    @Column(name = "ip_address", columnDefinition = "inet")
    private String ipAddress;
}
