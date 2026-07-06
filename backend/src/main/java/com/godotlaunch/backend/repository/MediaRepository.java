package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Media;
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
    // Media của Game (FK game_id) — sắp theo created_at desc để .findFirst() luôn lấy bản mới nhất, tránh
    // trả về ngẫu nhiên khi lỡ tồn tại nhiều dòng cùng mediaType (VD: race condition khi thay thumbnail/video).
    List<Media> findByGame_IdOrderByCreatedAtDesc(UUID gameId);
    List<Media> findByGame_IdAndMediaType(UUID gameId, String mediaType);
    void deleteByGame_Id(UUID gameId);
    void deleteByGame_IdAndMediaType(UUID gameId, String mediaType);

    // Media của Asset (FK asset_id)
    List<Media> findByAsset_IdOrderByCreatedAtDesc(UUID assetId);
    List<Media> findByAsset_IdAndMediaType(UUID assetId, String mediaType);
    void deleteByAsset_Id(UUID assetId);
    void deleteByAsset_IdAndMediaType(UUID assetId, String mediaType);

    @Query("SELECT m FROM Media m WHERE :search IS NULL OR :search = '' OR " +
           "LOWER(m.mediaUrl) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.mediaType) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Media> searchMedia(@Param("search") String search, Pageable pageable);

    @Query("SELECT m FROM Media m WHERE m.mediaType = 'video' AND " +
           "(:search IS NULL OR :search = '' OR LOWER(m.mediaUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Media> searchMediaVideos(@Param("search") String search, Pageable pageable);

    @Query("SELECT m FROM Media m WHERE m.mediaType <> 'video' AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(m.mediaUrl) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.mediaType) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Media> searchMediaImages(@Param("search") String search, Pageable pageable);
}
