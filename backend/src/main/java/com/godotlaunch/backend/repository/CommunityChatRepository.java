package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.CommunityChat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommunityChatRepository extends JpaRepository<CommunityChat, UUID> {

    Optional<CommunityChat> findByIdAndIsDeletedFalse(UUID id);

    @Query("SELECT c FROM CommunityChat c WHERE c.parentMessage IS NULL AND c.isDeleted = false AND (:gameId IS NULL OR c.game.id = :gameId) ORDER BY c.createdAt DESC")
    Page<CommunityChat> findFeed(@Param("gameId") UUID gameId, Pageable pageable);

    Page<CommunityChat> findByParentMessageIdAndIsDeletedFalse(UUID parentMessageId, Pageable pageable);
}
