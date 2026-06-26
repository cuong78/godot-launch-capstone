package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.enums.MediaOwnerType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

@Repository
public interface MediaRepository extends JpaRepository<Media, UUID> {
    List<Media> findByOwnerTypeAndOwnerId(MediaOwnerType ownerType, UUID ownerId);
    List<Media> findByOwnerTypeAndOwnerIdAndMediaType(MediaOwnerType ownerType, UUID ownerId, String mediaType);
    void deleteByOwnerTypeAndOwnerId(MediaOwnerType ownerType, UUID ownerId);
    void deleteByOwnerTypeAndOwnerIdAndMediaType(MediaOwnerType ownerType, UUID ownerId, String mediaType);

    @Query("SELECT m FROM Media m WHERE :search IS NULL OR :search = '' OR " +
           "LOWER(m.mediaUrl) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.mediaType) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Media> searchMedia(@Param("search") String search, Pageable pageable);
}
