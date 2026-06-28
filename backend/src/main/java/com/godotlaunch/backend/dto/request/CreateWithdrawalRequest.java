package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateWithdrawalRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "10000", message = "Minimum withdrawal amount is 10000 VND")
    private BigDecimal amount;

    @NotBlank(message = "Bank name is required")
    private String bankName;

    @NotBlank(message = "Bank account is required")
    private String bankAccount;

    @NotBlank(message = "Account holder is required")
    private String accountHolder;

    private String note;
}
