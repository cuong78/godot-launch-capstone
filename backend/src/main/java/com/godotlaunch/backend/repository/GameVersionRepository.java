package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.GameVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GameVersionRepository extends JpaRepository<GameVersion, UUID> {
    Optional<GameVersion> findByGame_IdAndIsCurrentTrue(UUID gameId);
    List<GameVersion> findByGame_IdOrderByReleasedAtDesc(UUID gameId);
    Optional<GameVersion> findByGame_IdAndVersionNumber(UUID gameId, String versionNumber);
}
