package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    Optional<Review> findByUserIdAndGameId(UUID userId, UUID gameId);

    Optional<Review> findByUserIdAndAssetId(UUID userId, UUID assetId);

    boolean existsByUserIdAndGameId(UUID userId, UUID gameId);

    boolean existsByUserIdAndAssetId(UUID userId, UUID assetId);

    Page<Review> findByGameIdOrderByCreatedAtDesc(UUID gameId, Pageable pageable);

    Page<Review> findByAssetIdOrderByCreatedAtDesc(UUID assetId, Pageable pageable);

    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.game.id = :gameId")
    Double getAverageRatingByGameId(@Param("gameId") UUID gameId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.game.id = :gameId")
    Long countByGameId(@Param("gameId") UUID gameId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.asset.id = :assetId")
    Double getAverageRatingByAssetId(@Param("assetId") UUID assetId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.asset.id = :assetId")
    Long countByAssetId(@Param("assetId") UUID assetId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.game.id = :gameId GROUP BY r.rating")
    List<Object[]> getRatingBreakdownByGameId(@Param("gameId") UUID gameId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.asset.id = :assetId GROUP BY r.rating")
    List<Object[]> getRatingBreakdownByAssetId(@Param("assetId") UUID assetId);
}
