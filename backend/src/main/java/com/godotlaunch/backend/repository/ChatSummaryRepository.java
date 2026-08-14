package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.ChatSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChatSummaryRepository extends JpaRepository<ChatSummary, String> {
    Optional<ChatSummary> findBySessionId(String sessionId);
}
