// package com.jspcs.pos.entity.system;

// import com.jspcs.pos.entity.base.AbstractEntity;
// import com.jspcs.pos.entity.user.User;
// import jakarta.persistence.*;
// import lombok.AllArgsConstructor;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
// import lombok.Setter;
// import lombok.experimental.SuperBuilder;
// import org.hibernate.annotations.JdbcTypeCode;
// import org.hibernate.type.SqlTypes;

// import java.util.Map;
// import java.util.UUID;

// @Entity
// @Table(name = "audit_logs")
// @Getter
// @Setter
// @SuperBuilder
// @NoArgsConstructor
// @AllArgsConstructor
// public class AuditLog extends AbstractEntity {

//     @ManyToOne(fetch = FetchType.LAZY)
//     @JoinColumn(name = "user_id")
//     private User user;

//     @Column(nullable = false)
//     private String action;

//     @Column(name = "entity_type", nullable = false)
//     private String entityType;

//     @Column(name = "entity_id")
//     private UUID entityId;

//     @JdbcTypeCode(SqlTypes.JSON)
//     @Column(name = "old_values", columnDefinition = "jsonb")
//     private Map<String, Object> oldValues;

//     @JdbcTypeCode(SqlTypes.JSON)
//     @Column(name = "new_values", columnDefinition = "jsonb")
//     private Map<String, Object> newValues;

//     @Column(name = "ip_address")
//     private String ipAddress;

//     @Column(name = "user_agent")
//     private String userAgent;
// }

package com.jspcs.pos.entity.system;

import com.jspcs.pos.entity.base.AbstractEntity;
import com.jspcs.pos.entity.user.User;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog extends AbstractEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String action;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "old_values", columnDefinition = "jsonb")
    private Map<String, Object> oldValues;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_values", columnDefinition = "jsonb")
    private Map<String, Object> newValues;

    // ✅ FIX IS HERE
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.INET)
    @Column(name = "ip_address", columnDefinition = "inet")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;
}
