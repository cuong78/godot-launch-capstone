package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter
@Setter
public class AddCartItemRequest {
    @NotNull(message = "Item ID is required")
    private UUID itemId;

    @NotNull(message = "Item Type is required")
    private String itemType; // "asset" or "game"/"source_code"
}
