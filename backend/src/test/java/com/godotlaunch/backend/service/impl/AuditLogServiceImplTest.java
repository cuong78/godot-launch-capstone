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

    @Test
    @DisplayName("shouldHandleAuditLogEvent_AndSaveToMongo_WhenActorNotFound")
    void shouldHandleAuditLogEvent_AndSaveToMongo_WhenActorNotFound() {
        // Arrange
        UUID unknownActorId = UUID.randomUUID();
        AuditLogEvent event = AuditLogEvent.builder()
                .actorId(unknownActorId)
                .action(AuditAction.game_published)
                .targetType(AuditTarget.game)
                .targetId(UUID.randomUUID())
                .oldValue("\"pending\"")
                .newValue("\"published\"")
                .note("Game approved")
                .ipAddress("127.0.0.1")
                .build();

        when(userRepository.findWithRoleById(unknownActorId)).thenReturn(Optional.empty());

        // Act
        auditLogService.handleAuditLogEvent(event);

        // Assert
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    void shouldPublishAuto_WhenCalled() {
        org.springframework.security.core.context.SecurityContext securityContext = mock(org.springframework.security.core.context.SecurityContext.class);
        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn("admin@godotlaunch.dev");
        when(securityContext.getAuthentication()).thenReturn(auth);
        org.springframework.security.core.context.SecurityContextHolder.setContext(securityContext);

        auditLogService.publishAuto(AuditAction.game_published, AuditTarget.game, UUID.randomUUID(), "old", "new", "note");

        verify(eventPublisher, times(1)).publishEvent(any(AuditLogEvent.class));
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    void shouldHandleAuditLogEvent_WhenActorEmailProvided() {
        AuditLogEvent event = AuditLogEvent.builder()
                .actorEmail("admin@godotlaunch.dev")
                .action(AuditAction.game_published)
                .targetType(AuditTarget.game)
                .targetId(UUID.randomUUID())
                .build();

        when(userRepository.findWithRoleByEmail("admin@godotlaunch.dev")).thenReturn(Optional.of(actor));

        auditLogService.handleAuditLogEvent(event);

        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    void shouldFallbackSerialization_WhenExceptionOccurs() throws Exception {
        when(objectMapper.writeValueAsString(any())).thenThrow(new RuntimeException("Serialization error"));

        auditLogService.publish(actorId, ActorRole.admin, AuditAction.game_published,
                AuditTarget.game, UUID.randomUUID(), "old-value", "new-value", "Approved", "127.0.0.1");

        verify(eventPublisher, times(1)).publishEvent(any(AuditLogEvent.class));
    }
}
