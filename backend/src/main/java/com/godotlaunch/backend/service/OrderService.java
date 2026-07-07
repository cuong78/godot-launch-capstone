package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.enums.OrderType;

import java.util.UUID;

public interface OrderService {
    Order buy(String buyerEmail, UUID targetId, OrderType orderType);
}
