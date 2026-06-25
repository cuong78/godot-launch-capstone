package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.enums.MediaOwnerType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MediaRepository extends JpaRepository<Media, UUID> {
    List<Media> findByOwnerTypeAndOwnerId(MediaOwnerType ownerType, UUID ownerId);
    List<Media> findByOwnerTypeAndOwnerIdAndMediaType(MediaOwnerType ownerType, UUID ownerId, String mediaType);
    void deleteByOwnerTypeAndOwnerId(MediaOwnerType ownerType, UUID ownerId);
    void deleteByOwnerTypeAndOwnerIdAndMediaType(MediaOwnerType ownerType, UUID ownerId, String mediaType);
}
