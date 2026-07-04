package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class    AuditLog {

    @Id
    private UUID id;

    @Field("actor_id")
    private UUID actorId;

    @Field("actor_email")
    private String actorEmail;

    @Field("actor_fullname")
    private String actorFullName;

    @Field("actor_role")
    private ActorRole actorRole;

    private AuditAction action;

    @Field("target_type")
    private AuditTarget targetType;

    @Field("target_id")
    private UUID targetId;

    @Field("old_value")
    private String oldValue;

    @Field("new_value")
    private String newValue;

    private String note;

    @Field("ip_address")
    private String ipAddress;

    @Field("created_at")
    private Instant createdAt;
}
