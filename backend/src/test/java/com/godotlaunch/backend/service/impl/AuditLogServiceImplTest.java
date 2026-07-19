package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.entity.AuditLog;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.event.AuditLogEvent;
import com.godotlaunch.backend.repository.AuditLogRepository;
import com.godotlaunch.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceImplTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AuditLogServiceImpl auditLogService;

    private UUID actorId;
    private User actor;

    @BeforeEach
    void setUp() {
        actorId = UUID.randomUUID();
        Role role = new Role();
        role.setName("admin");

        actor = new User();
        actor.setId(actorId);
        actor.setEmail("admin@godotlaunch.dev");
        actor.setFullName("System Admin");
        actor.setRole(role);
    }

    @Test
    @DisplayName("shouldPublishEvent_WhenPublishCalled")
    void shouldPublishEvent_WhenPublishCalled() {
        // Act
        auditLogService.publish(actorId, ActorRole.admin, AuditAction.game_published,
                AuditTarget.game, UUID.randomUUID(), "old", "new", "Approved", "127.0.0.1");

        // Assert
        verify(eventPublisher, times(1)).publishEvent(any(AuditLogEvent.class));
    }

    @Test
    @DisplayName("shouldHandleAuditLogEvent_AndSaveToMongo")
    void shouldHandleAuditLogEvent_AndSaveToMongo() {
        // Arrange
        AuditLogEvent event = AuditLogEvent.builder()
                .actorId(actorId)
                .action(AuditAction.game_published)
                .targetType(AuditTarget.game)
                .targetId(UUID.randomUUID())
                .oldValue("\"pending\"")
                .newValue("\"published\"")
                .note("Game approved")
                .ipAddress("127.0.0.1")
                .build();

        when(userRepository.findWithRoleById(actorId)).thenReturn(Optional.of(actor));

        // Act
        auditLogService.handleAuditLogEvent(event);

        // Assert
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }
}
