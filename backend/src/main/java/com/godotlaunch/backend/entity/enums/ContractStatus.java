package com.godotlaunch.backend.entity.enums;

public enum ContractStatus {
    pending,    // admin vừa chào, chờ developer ký
    signed,     // developer đã ký — bản chính thức
    expired,
    cancelled
}
