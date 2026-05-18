package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.AIReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AIReportRepository extends JpaRepository<AIReport, UUID> {
    Optional<AIReport> findByGameId(UUID gameId);
}
