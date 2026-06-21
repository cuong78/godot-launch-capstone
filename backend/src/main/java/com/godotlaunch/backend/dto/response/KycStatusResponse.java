package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Builder
public class KycStatusResponse {
    private boolean kycVerified;
    private String documentType;
    private String fullName;
    private String idNumber;
    private LocalDate dateOfBirth;
    private String address;
    private Instant kycVerifiedAt;
}
