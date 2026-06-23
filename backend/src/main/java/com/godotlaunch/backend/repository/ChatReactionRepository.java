package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.ChatReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatReactionRepository extends JpaRepository<ChatReaction, UUID> {

    Optional<ChatReaction> findByChatIdAndUserId(UUID chatId, UUID userId);

    long countByChatId(UUID chatId);

    java.util.List<ChatReaction> findByChatId(UUID chatId);
}
