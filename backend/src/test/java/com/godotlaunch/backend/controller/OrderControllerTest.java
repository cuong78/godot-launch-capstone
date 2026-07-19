package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateOrderRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.enums.OrderType;
import com.godotlaunch.backend.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderControllerTest {

    @Mock
    private OrderService orderService;

    @Mock
    private Principal principal;

    @InjectMocks
    private OrderController orderController;

    private UUID targetId;
    private UUID orderId;
    private Order mockOrder;

    @BeforeEach
    void setUp() {
        targetId = UUID.randomUUID();
        orderId = UUID.randomUUID();

        mockOrder = new Order();
        mockOrder.setId(orderId);
    }

    @Test
    @DisplayName("Should purchase item using wallet balance successfully")
    void shouldBuy_Successfully() {
        // Arrange
        CreateOrderRequest request = new CreateOrderRequest();
        request.setTargetId(targetId);
        request.setOrderType(OrderType.asset_purchase);

        when(principal.getName()).thenReturn("buyer@example.com");
        when(orderService.buy("buyer@example.com", targetId, OrderType.asset_purchase)).thenReturn(mockOrder);

        // Act
        ResponseEntity<ApiResponse<Map<String, UUID>>> result = orderController.buy(request, principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData().get("orderId")).isEqualTo(orderId);

        verify(orderService, times(1)).buy("buyer@example.com", targetId, OrderType.asset_purchase);
    }
}
