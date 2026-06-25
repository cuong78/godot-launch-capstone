package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.AuditLogResponse;
import com.godotlaunch.backend.entity.AuditLog;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Audit Log API", description = "Endpoints for administrators to query and view system audit logs")
public class AdminAuditLogController {

    private final MongoTemplate mongoTemplate;

    @GetMapping
    @Operation(summary = "Get audit logs with filtering", description = "Retrieves a paginated list of audit logs with optional filters. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) AuditTarget targetType,
            @RequestParam(required = false) UUID targetId,
            @RequestParam(required = false) String ipAddress
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Query query = new Query();

        if (actorId != null) {
            query.addCriteria(Criteria.where("actorId").is(actorId));
        }
        if (action != null) {
            query.addCriteria(Criteria.where("action").is(action));
        }
        if (targetType != null) {
            query.addCriteria(Criteria.where("targetType").is(targetType));
        }
        if (targetId != null) {
            query.addCriteria(Criteria.where("targetId").is(targetId));
        }
        if (ipAddress != null && !ipAddress.trim().isEmpty()) {
            query.addCriteria(Criteria.where("ipAddress").is(ipAddress.trim()));
        }

        long total = mongoTemplate.count(query, AuditLog.class);
        query.with(pageable);
        List<AuditLog> logs = mongoTemplate.find(query, AuditLog.class);
        Page<AuditLog> logPage = PageableExecutionUtils.getPage(logs, pageable, () -> total);
        Page<AuditLogResponse> responsePage = logPage.map(this::mapToResponse);

        return ResponseEntity.ok(ApiResponse.success(responsePage, "Audit logs retrieved successfully."));
    }

    private AuditLogResponse mapToResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .actorId(log.getActorId())
                .actorEmail(log.getActorEmail())
                .actorFullName(log.getActorFullName())
                .actorRole(log.getActorRole())
                .action(log.getAction())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .oldValue(log.getOldValue())
                .newValue(log.getNewValue())
                .note(log.getNote())
                .ipAddress(log.getIpAddress())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
