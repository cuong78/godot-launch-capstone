package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;

import java.util.UUID;

public interface AuditLogService {

    /**
     * Publishes an audit log event with explicit details.
     */
    void publish(UUID actorId, ActorRole actorRole, AuditAction action, AuditTarget targetType, 
                 UUID targetId, Object oldValue, Object newValue, String note, String ipAddress);

    /**
     * Publishes an audit log event, auto-resolving the actor (current authenticated user)
     * and their IP address from the request context.
     */
    void publishAuto(AuditAction action, AuditTarget targetType, UUID targetId, 
                     Object oldValue, Object newValue, String note);
}
