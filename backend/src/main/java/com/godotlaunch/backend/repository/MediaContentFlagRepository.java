package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.MediaContentFlag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MediaContentFlagRepository extends JpaRepository<MediaContentFlag, UUID> {

    @Query("SELECT f FROM MediaContentFlag f " +
           "WHERE (:status IS NULL OR f.status = :status) " +
           "AND (:ownerType IS NULL OR f.ownerType = :ownerType) " +
           "AND (:onlyFlagged = false OR f.flagged = true) " +
           "AND (:search IS NULL OR :search = '' OR " +
           "     LOWER(COALESCE(f.ownerName, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(f.mediaUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<MediaContentFlag> search(
            @Param("status") String status,
            @Param("ownerType") String ownerType,
            @Param("onlyFlagged") boolean onlyFlagged,
            @Param("search") String search,
            Pageable pageable);

    long countByStatus(String status);

    boolean existsByMediaUrlAndStatus(String mediaUrl, String status);
}
