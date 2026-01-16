package com.jspcs.pos.entity.system;

import com.jspcs.pos.entity.base.AbstractEntity;
import com.jspcs.pos.entity.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "backup_metadata")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class BackupMetadata extends AbstractEntity {

    @Column(name = "backup_type", nullable = false)
    private String backupType;

    @Column(name = "backup_file_path", nullable = false)
    private String backupFilePath;

    @Column(name = "backup_file_size", nullable = false)
    private Long backupFileSize;

    @Column(name = "backup_started_at", nullable = false)
    private LocalDateTime backupStartedAt;

    @Column(name = "backup_completed_at")
    private LocalDateTime backupCompletedAt;

    @Column(name = "backup_status", nullable = false)
    private String backupStatus;

    @Column(name = "error_message")
    private String errorMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
}
