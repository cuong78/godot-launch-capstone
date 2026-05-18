package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.PublishingGuide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PublishingGuideRepository extends JpaRepository<PublishingGuide, UUID> {
}
