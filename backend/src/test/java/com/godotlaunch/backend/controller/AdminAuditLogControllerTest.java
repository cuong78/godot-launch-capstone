package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.AuditLogResponse;
import com.godotlaunch.backend.entity.AuditLog;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAuditLogControllerTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @InjectMocks
    private AdminAuditLogController adminAuditLogController;

    private AuditLog auditLog;

    @BeforeEach
    void setUp() {
        auditLog = new AuditLog();
        auditLog.setId(UUID.randomUUID());
        auditLog.setActorEmail("admin@godotlaunch.dev");
        auditLog.setAction(AuditAction.game_published);
        auditLog.setTargetType(AuditTarget.game);
    }

    @Test
    @DisplayName("shouldGetAuditLogs_WhenFiltersProvided")
    void shouldGetAuditLogs_WhenFiltersProvided() {
        // Arrange
        when(mongoTemplate.count(any(Query.class), eq(AuditLog.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), eq(AuditLog.class))).thenReturn(List.of(auditLog));

        // Act
        ResponseEntity<ApiResponse<Page<AuditLogResponse>>> response = adminAuditLogController.getAuditLogs(
                0, 20, null, AuditAction.game_published, AuditTarget.game, null, "127.0.0.1");

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getTotalElements()).isEqualTo(1L);
        assertThat(response.getBody().getData().getContent().get(0).getAction()).isEqualTo(AuditAction.game_published);
        verify(mongoTemplate, times(1)).count(any(Query.class), eq(AuditLog.class));
        verify(mongoTemplate, times(1)).find(any(Query.class), eq(AuditLog.class));
    }
}
