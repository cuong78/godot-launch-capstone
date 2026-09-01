package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.StoreRevenueStatement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StoreRevenueStatementRepository extends JpaRepository<StoreRevenueStatement, UUID> {
    Optional<StoreRevenueStatement> findByExternalPayoutId(String externalPayoutId);
    Optional<StoreRevenueStatement> findByGameIdAndPeriodKey(UUID gameId, String periodKey);
    List<StoreRevenueStatement> findByGameIdOrderBySettledAtDesc(UUID gameId);
    List<StoreRevenueStatement> findAllByOrderBySettledAtDesc();
    long countByGameId(UUID gameId);
}
