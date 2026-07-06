package com.godotlaunch.backend.dto.request;

import com.godotlaunch.backend.entity.enums.OrderType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreateOrderRequest {

    @NotNull(message = "Target item ID is required.")
    private UUID targetId;

    @NotNull(message = "Order type is required.")
    private OrderType orderType;
}
