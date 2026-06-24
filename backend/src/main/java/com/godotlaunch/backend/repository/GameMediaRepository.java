package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.GameMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GameMediaRepository extends JpaRepository<GameMedia, UUID> {
    List<GameMedia> findByGameId(UUID gameId);
    void deleteByGameId(UUID gameId);
    void deleteByGameIdAndMediaType(UUID gameId, String mediaType);
}
