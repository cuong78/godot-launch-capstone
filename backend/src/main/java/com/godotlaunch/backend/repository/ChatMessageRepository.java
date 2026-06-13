package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    
    @Query("SELECT m FROM ChatMessage m " +
           "JOIN FETCH m.sender " +
           "JOIN FETCH m.recipient " +
           "WHERE (m.sender.id = :u1 AND m.recipient.id = :u2) OR " +
           "(m.sender.id = :u2 AND m.recipient.id = :u1) " +
           "ORDER BY m.createdAt ASC")
    List<ChatMessage> findChatHistory(@Param("u1") UUID u1, @Param("u2") UUID u2);

    @Query("SELECT m FROM ChatMessage m " +
           "JOIN FETCH m.sender " +
           "JOIN FETCH m.recipient " +
           "WHERE m.sender.id = :userId OR m.recipient.id = :userId " +
           "ORDER BY m.createdAt DESC")
    List<ChatMessage> findAllBySenderIdOrRecipientIdOrderByCreatedAtDesc(@Param("userId") UUID userId);
}
