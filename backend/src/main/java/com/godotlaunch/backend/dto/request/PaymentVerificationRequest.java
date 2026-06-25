package com.godotlaunch.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentVerificationRequest {
    private String rejectionReason;
}
