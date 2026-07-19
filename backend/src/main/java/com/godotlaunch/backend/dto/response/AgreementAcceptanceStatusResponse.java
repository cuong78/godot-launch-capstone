package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AgreementAcceptanceStatusResponse {

    private boolean accepted;
    private Integer acceptedVersion;
    private Instant acceptedAt;
}
