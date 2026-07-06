package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateOrderRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Order API", description = "Endpoints for purchasing games and assets using wallet balance directly")
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @Operation(summary = "Buy game or asset using wallet balance", description = "Deducts direct from buyer's wallet, credits seller and platform wallets, creates order and transaction records.")
    public ResponseEntity<ApiResponse<Map<String, UUID>>> buy(
            @Valid @RequestBody CreateOrderRequest request,
            Principal principal) {
        Order order = orderService.buy(principal.getName(), request.getTargetId(), request.getOrderType());
        return ResponseEntity.ok(ApiResponse.success(Map.of("orderId", order.getId()), "Mua thành công"));
    }
}
