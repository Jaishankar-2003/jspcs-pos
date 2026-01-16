package com.jspcs.pos.repository;

import com.jspcs.pos.entity.system.License;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LicenseRepository extends JpaRepository<License, UUID> {
    Optional<License> findByLicenseKey(String licenseKey);
}
