package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreatePaymentRequest {

    @NotNull(message = "Marketplace item is required.")
    private UUID assetId;
}
