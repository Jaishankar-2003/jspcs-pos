package com.jspcs.pos.repository;

import com.jspcs.pos.entity.system.ManualEntryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ManualEntryLogRepository extends JpaRepository<ManualEntryLog, UUID> {
}
