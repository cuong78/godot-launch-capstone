package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.GameVersionReleaseEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GameVersionReleaseEventRepository extends JpaRepository<GameVersionReleaseEvent, UUID> {

    long countByStatus(String status);

    @Query(value = """
            SELECT *
            FROM public.game_version_release_events
            WHERE next_attempt_at <= now()
              AND (
                    status = 'pending'
                    OR (status = 'processing' AND locked_at < now() - interval '15 minutes')
                  )
            ORDER BY created_at
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """, nativeQuery = true)
    Optional<GameVersionReleaseEvent> lockNextProcessableEvent();
}
