package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BankSetupRequest {

    @NotBlank(message = "Bank name is required.")
    @Size(max = 200, message = "Bank name cannot exceed 200 characters.")
    private String bankName;

    @NotBlank(message = "Bank account is required.")
    @Pattern(regexp = "\\d{6,30}", message = "Bank account must contain 6 to 30 digits.")
    private String bankAccount;

    @NotBlank(message = "Bank account holder is required.")
    @Size(max = 200, message = "Bank account holder cannot exceed 200 characters.")
    private String bankAccountHolder;
}
