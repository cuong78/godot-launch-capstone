package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.enums.GameStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GameRepository extends JpaRepository<Game, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM Game g WHERE g.id = :gameId")
    Optional<Game> findByIdForUpdate(@Param("gameId") UUID gameId);

    @EntityGraph(attributePaths = {"creator", "category", "tags"})
    @Query("SELECT DISTINCT g FROM Game g WHERE g.id = :gameId")
    Optional<Game> findForAiReviewById(@Param("gameId") UUID gameId);

    List<Game> findByStatus(GameStatus status);
    List<Game> findAllByOrderByCreatedAtDesc();
    List<Game> findByStatusOrderByCreatedAtDesc(GameStatus status);

    @EntityGraph(attributePaths = {"creator", "category", "tags"})
    @Query("SELECT DISTINCT g FROM Game g WHERE g.status = :status")
    List<Game> findStorefrontGames(@Param("status") GameStatus status);

    @EntityGraph(attributePaths = {"creator", "category", "tags"})
    @Query("SELECT DISTINCT g FROM Game g WHERE (:status IS NULL OR g.status = :status) " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(g.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.category.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Game> searchGames(@Param("status") GameStatus status, @Param("search") String search);

    @Query("SELECT g FROM Game g WHERE g.status = 'pending' OR g.pendingUpdateSnapshot IS NOT NULL ORDER BY g.createdAt DESC")
    List<Game> findPendingGamesAndUpdates();

    @Query("SELECT g FROM Game g WHERE g.thumbnailUrl IS NOT NULL AND g.thumbnailUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(g.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.thumbnailUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Game> searchGameThumbnails(@Param("search") String search, Pageable pageable);

    @Query("SELECT g FROM Game g WHERE :search IS NULL OR :search = '' OR " +
           "LOWER(g.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Game> searchGamesForFileManagement(@Param("search") String search, Pageable pageable);
}
