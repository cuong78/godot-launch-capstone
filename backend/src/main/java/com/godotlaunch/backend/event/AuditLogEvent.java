package com.godotlaunch.backend.event;

import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class AuditLogEvent {
    private final UUID actorId;
    private final String actorEmail;
    private final ActorRole actorRole;
    private final AuditAction action;
    private final AuditTarget targetType;
    private final UUID targetId;
    private final String oldValue;
    private final String newValue;
    private final String note;
    private final String ipAddress;
    private final Instant createdAt;
}
