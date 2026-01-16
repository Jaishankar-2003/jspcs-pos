package com.jspcs.pos.repository;

import com.jspcs.pos.entity.user.CashierCounter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CashierCounterRepository extends JpaRepository<CashierCounter, UUID> {
    Optional<CashierCounter> findByCounterNumber(String counterNumber);
}
