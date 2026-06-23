package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.AuditLog;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.event.AuditLogEvent;
import com.godotlaunch.backend.repository.AuditLogRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private void writeDebugLog(String message) {
        try {
            java.nio.file.Path path = java.nio.file.Paths.get("audit-debug.log");
            String logLine = java.time.LocalDateTime.now() + " : " + message + "\n";
            java.nio.file.Files.writeString(path, logLine, 
                    java.nio.file.StandardOpenOption.CREATE, 
                    java.nio.file.StandardOpenOption.APPEND);
        } catch (Exception e) {
            // ignore
        }
    }

    @Override
    public void publish(UUID actorId, ActorRole actorRole, AuditAction action, AuditTarget targetType, 
                        UUID targetId, Object oldValue, Object newValue, String note, String ipAddress) {
        
        writeDebugLog("publish called: action=" + action + ", target=" + targetType + ", targetId=" + targetId);
        String oldValStr = serializeToJson(oldValue);
        String newValStr = serializeToJson(newValue);

        AuditLogEvent event = AuditLogEvent.builder()
                .actorId(actorId)
                .actorRole(actorRole)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .oldValue(oldValStr)
                .newValue(newValStr)
                .note(note)
                .ipAddress(ipAddress)
                .createdAt(Instant.now())
                .build();

        eventPublisher.publishEvent(event);
    }

    @Override
    public void publishAuto(AuditAction action, AuditTarget targetType, UUID targetId, 
                            Object oldValue, Object newValue, String note) {
        
        String currentEmail = null;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof String) {
            currentEmail = (String) authentication.getPrincipal();
        }

        writeDebugLog("publishAuto called: action=" + action + ", target=" + targetType + ", targetId=" + targetId + ", actorEmail=" + currentEmail);
        String ipAddress = getClientIp();
        String oldValStr = serializeToJson(oldValue);
        String newValStr = serializeToJson(newValue);

        AuditLogEvent event = AuditLogEvent.builder()
                .actorEmail(currentEmail)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .oldValue(oldValStr)
                .newValue(newValStr)
                .note(note)
                .ipAddress(ipAddress)
                .createdAt(Instant.now())
                .build();

        eventPublisher.publishEvent(event);
    }

    @Async("auditLogExecutor")
    @EventListener
    @Transactional
    public void handleAuditLogEvent(AuditLogEvent event) {
        writeDebugLog("handleAuditLogEvent started for action=" + event.getAction());
        try {
            AuditLog logEntity = new AuditLog();
            
            User actor = null;
            ActorRole role = event.getActorRole();

            // 1. Resolve user actor
            if (event.getActorId() != null) {
                // Highly performant: uses JPA proxy, avoids SELECT query
                actor = entityManager.getReference(User.class, event.getActorId());
            } else if (event.getActorEmail() != null) {
                // If only email is present (auto-resolved from security context), fetch user
                actor = userRepository.findByEmail(event.getActorEmail()).orElse(null);
                if (actor != null && role == null) {
                    role = mapToActorRole(actor.getRole().getName());
                }
            }

            // Fallback for role if not resolved
            if (role == null) {
                role = ActorRole.customer;
            }

            logEntity.setActor(actor);
            logEntity.setActorRole(role);
            logEntity.setAction(event.getAction());
            logEntity.setTargetType(event.getTargetType());
            UUID targetId = event.getTargetId();
            if (targetId == null) {
                targetId = new UUID(0L, 0L);
            }
            logEntity.setTargetId(targetId);
            logEntity.setOldValue(event.getOldValue());
            logEntity.setNewValue(event.getNewValue());
            logEntity.setNote(event.getNote());
            logEntity.setIpAddress(event.getIpAddress());
            
            auditLogRepository.save(logEntity);
            writeDebugLog("handleAuditLogEvent success: saved audit log id=" + logEntity.getId());
            log.debug("Successfully saved audit log asynchronously for action {}", event.getAction());
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            writeDebugLog("handleAuditLogEvent ERROR: " + e.getMessage() + "\n" + sw.toString());
            log.error("Failed to save audit log asynchronously for action {}", event.getAction(), e);
        }
    }

    private String serializeToJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            log.warn("Failed to serialize object to JSON for audit log: {}", e.getMessage());
            return "\"" + String.valueOf(value).replace("\"", "\\\"") + "\"";
        }
    }

    private String getClientIp() {
        try {
            RequestAttributes attribs = RequestContextHolder.getRequestAttributes();
            if (attribs instanceof ServletRequestAttributes) {
                HttpServletRequest request = ((ServletRequestAttributes) attribs).getRequest();
                String ipAddress = request.getHeader("X-Forwarded-For");
                if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
                    ipAddress = request.getHeader("X-Real-IP");
                }
                if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
                    ipAddress = request.getRemoteAddr();
                }
                // If request passed through multiple proxies, get the first one
                if (ipAddress != null && ipAddress.contains(",")) {
                    ipAddress = ipAddress.split(",")[0].trim();
                }
                return ipAddress;
            }
        } catch (Exception e) {
            log.debug("Failed to resolve client IP: {}", e.getMessage());
        }
        return null;
    }

    private ActorRole mapToActorRole(String roleName) {
        if (roleName == null) return ActorRole.customer;
        switch (roleName.trim().toLowerCase()) {
            case "admin":
                return ActorRole.admin;
            case "developer":
                return ActorRole.developer;
            case "customer":
            default:
                return ActorRole.customer;
        }
    }
}
