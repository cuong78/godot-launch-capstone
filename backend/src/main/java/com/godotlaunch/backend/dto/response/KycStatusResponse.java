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
    private String kycFrontImageUrl;
    private String kycBackImageUrl;
    private String bankName;
    private String bankAccount;
    private String bankAccountHolder;
    // Chỉ có giá trị khi bước thiết lập ngân hàng vừa hoàn tất nâng role developer.
    // Frontend dùng để refresh session ngay, không cần đăng nhập lại.
    private String token;
}
