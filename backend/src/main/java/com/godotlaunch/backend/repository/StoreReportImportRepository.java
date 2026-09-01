package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.StoreReportImport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StoreReportImportRepository extends JpaRepository<StoreReportImport, UUID> {
    List<StoreReportImport> findByExternalPublishIdOrderBySyncedAtDesc(UUID externalPublishId);
    List<StoreReportImport> findAllByOrderBySyncedAtDesc();
    List<StoreReportImport> findByExternalPublish_Game_IdOrderBySyncedAtDesc(UUID gameId);
    java.util.Optional<StoreReportImport> findFirstByExternalPublish_Game_IdOrderBySyncedAtDesc(UUID gameId);
}
