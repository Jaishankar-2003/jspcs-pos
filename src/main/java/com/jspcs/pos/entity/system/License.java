package com.jspcs.pos.entity.system;

import com.jspcs.pos.entity.base.AuditableEntity;
import com.jspcs.pos.entity.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "licenses")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class License extends AuditableEntity {

    @Column(name = "license_key", nullable = false, unique = true)
    private String licenseKey;

    @Column(name = "license_type", nullable = false)
    private String licenseType;

    @Column(name = "max_counters", nullable = false)
    private Integer maxCounters;

    @Column(name = "max_users", nullable = false)
    private Integer maxUsers;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_until", nullable = false)
    private LocalDate validUntil;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activated_by")
    private User activatedBy;

    @Column(name = "hardware_id")
    private String hardwareId;

    private String notes;
}
