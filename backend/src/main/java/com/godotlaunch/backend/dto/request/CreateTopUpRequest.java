package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
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
public class CreateTopUpRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "10000", message = "Minimum top-up amount is 10000 VND")
    private BigDecimal amount;
}
