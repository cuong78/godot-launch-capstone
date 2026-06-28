package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.SourceDownload;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SourceDownloadRepository extends JpaRepository<SourceDownload, UUID> {
    long countByUserIdAndMarketplaceItemIdAndOrderId(UUID userId, UUID marketplaceItemId, UUID orderId);
}
