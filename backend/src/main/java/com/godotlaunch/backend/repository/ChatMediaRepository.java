package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.ChatMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMediaRepository extends JpaRepository<ChatMedia, UUID> {

    List<ChatMedia> findByChatIdOrderByDisplayOrderAsc(UUID chatId);

    List<ChatMedia> findByChatIdInOrderByDisplayOrderAsc(Collection<UUID> chatIds);
}
