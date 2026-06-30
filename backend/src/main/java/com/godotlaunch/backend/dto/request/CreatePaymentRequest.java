package com.godotlaunch.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreatePaymentRequest {

    @NotNull(message = "Marketplace item is required.")
    @JsonAlias("marketplaceItemId")
    private UUID assetId;
}
