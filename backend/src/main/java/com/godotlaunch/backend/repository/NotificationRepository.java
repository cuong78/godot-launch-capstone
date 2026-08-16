package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId);
    long countByRecipientIdAndIsReadFalse(UUID recipientId);
    List<Notification> findAllByRecipientIdAndIsReadFalse(UUID recipientId);
    Optional<Notification> findByEventKey(String eventKey);

    @Modifying
    @Query(value = """
            INSERT INTO public.notifications
                (id, recipient_id, type, message, target_id, metadata, event_key, is_read, created_at)
            VALUES
                (gen_random_uuid(), :recipientId, 'GAME_VERSION_RELEASED', :message, :targetId,
                 CAST(:metadata AS jsonb), :eventKey, false, now())
            ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING
            """, nativeQuery = true)
    int insertGameVersionReleasedNotification(
            @Param("recipientId") UUID recipientId,
            @Param("message") String message,
            @Param("targetId") String targetId,
            @Param("metadata") String metadata,
            @Param("eventKey") String eventKey
    );
}
