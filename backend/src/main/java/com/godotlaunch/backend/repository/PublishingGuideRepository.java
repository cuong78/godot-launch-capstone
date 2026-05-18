package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.PublishingGuide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PublishingGuideRepository extends JpaRepository<PublishingGuide, UUID> {
    
    // Admin: Get all guides ordered by stepOrder
    List<PublishingGuide> findAllByOrderByStepOrderAsc();
    
    // Developer: Get only active guides ordered by stepOrder
    List<PublishingGuide> findByIsActiveTrueOrderByStepOrderAsc();
    
    // Prevent duplicate stepOrder
    boolean existsByStepOrder(Short stepOrder);
}
