package com.godotlaunch.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AgreementVersionResponse {

    private UUID id;
    private Integer version;
    private String content;
    private com.godotlaunch.backend.entity.enums.AgreementType type;

    @JsonProperty("isActive")
    private boolean isActive;

    private Instant createdAt;
}
