package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class KycConfirmRequest {

    @NotBlank(message = "Document type is required.")
    @Pattern(regexp = "cccd|passport", message = "documentType must be 'cccd' or 'passport'.")
    private String documentType;

    @NotBlank(message = "Full name is required.")
    private String fullName;

    @NotBlank(message = "ID number is required.")
    private String idNumber;

    private String dateOfBirth;

    private String address;

    private String frontImageBase64;

    private String backImageBase64;

    @NotBlank(message = "Bank name is required.")
    private String bankName;

    @NotBlank(message = "Bank account number is required.")
    private String bankAccount;

    @NotBlank(message = "Bank account holder name is required.")
    private String bankAccountHolder;
}
