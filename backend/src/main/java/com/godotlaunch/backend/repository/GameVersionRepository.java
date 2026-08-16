package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.GameVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GameVersionRepository extends JpaRepository<GameVersion, UUID> {
    Optional<GameVersion> findByGame_IdAndIsCurrentTrue(UUID gameId);
    List<GameVersion> findByGame_IdOrderByReleasedAtDesc(UUID gameId);
    Optional<GameVersion> findByGame_IdAndVersionNumber(UUID gameId, String versionNumber);

    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("UPDATE GameVersion version SET version.isCurrent = false " +
            "WHERE version.game.id = :gameId AND version.isCurrent = true")
    int deactivateCurrentVersion(@Param("gameId") UUID gameId);

    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("UPDATE GameVersion version SET version.isCurrent = false " +
            "WHERE version.game.id = :gameId AND version.isCurrent = true AND version.id <> :keepVersionId")
    int deactivateOtherCurrentVersions(
            @Param("gameId") UUID gameId,
            @Param("keepVersionId") UUID keepVersionId
    );
}
