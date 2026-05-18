package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Favorite;
import com.godotlaunch.backend.entity.FavoriteId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, FavoriteId> {
    List<Favorite> findByUserId(UUID userId);
    boolean existsByUserIdAndGameId(UUID userId, UUID gameId);
}
