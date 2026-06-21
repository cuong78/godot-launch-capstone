package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class KycOcrResponse {
    private String documentType;
    private String idNumber;
    private String fullName;
    private String dateOfBirth;
    private String address;
}
