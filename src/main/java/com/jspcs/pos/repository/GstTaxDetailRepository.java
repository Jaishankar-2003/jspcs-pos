package com.jspcs.pos.repository;

import com.jspcs.pos.entity.sales.GstTaxDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface GstTaxDetailRepository extends JpaRepository<GstTaxDetail, UUID> {
}
