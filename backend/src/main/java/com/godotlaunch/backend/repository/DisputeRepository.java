package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Dispute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, UUID> {
    List<Dispute> findByStatusOrderByCreatedAtDesc(String status);
    List<Dispute> findByReporterIdOrderByCreatedAtDesc(UUID reporterId);
    List<Dispute> findByReportedSellerIdOrderByCreatedAtDesc(UUID sellerId);
    long countByReporterIdAndStatus(UUID reporterId, String status);
    List<Dispute> findAllByOrderByCreatedAtDesc();
}
