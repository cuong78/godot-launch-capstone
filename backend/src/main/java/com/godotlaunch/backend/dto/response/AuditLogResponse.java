package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class AuditLogResponse {
    private UUID id;
    private UUID actorId;
    private String actorEmail;
    private String actorFullName;
    private ActorRole actorRole;
    private AuditAction action;
    private AuditTarget targetType;
    private UUID targetId;
    private String oldValue;
    private String newValue;
    private String note;
    private String ipAddress;
    private Instant createdAt;
}
