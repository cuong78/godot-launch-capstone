package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.enums.GameStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

@Repository
public interface GameRepository extends JpaRepository<Game, UUID> {
    List<Game> findByStatus(GameStatus status);

    @Query("SELECT g FROM Game g WHERE g.fileUrl IS NOT NULL AND g.fileUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(g.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.fileUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Game> searchGameZips(@Param("search") String search, Pageable pageable);

    @Query("SELECT g FROM Game g WHERE g.thumbnailUrl IS NOT NULL AND g.thumbnailUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(g.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(g.thumbnailUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Game> searchGameThumbnails(@Param("search") String search, Pageable pageable);
}
