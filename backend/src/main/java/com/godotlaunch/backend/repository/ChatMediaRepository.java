package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.ChatMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMediaRepository extends JpaRepository<ChatMedia, UUID> {

    List<ChatMedia> findByChatIdOrderByDisplayOrderAsc(UUID chatId);

    List<ChatMedia> findByChatIdInOrderByDisplayOrderAsc(Collection<UUID> chatIds);

    @Query("SELECT cm FROM ChatMedia cm WHERE :search IS NULL OR :search = '' OR " +
           "LOWER(cm.url) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<ChatMedia> searchChatMedia(@Param("search") String search, Pageable pageable);
}
