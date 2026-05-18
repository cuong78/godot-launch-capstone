package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.CommunityChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommunityChatRepository extends JpaRepository<CommunityChat, UUID> {
    List<CommunityChat> findByGameId(UUID gameId);
}
