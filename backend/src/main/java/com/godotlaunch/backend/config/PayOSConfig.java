package com.godotlaunch.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.payos.PayOS;

@Configuration
public class PayOSConfig {

    @Bean
    public PayOS payOS(
            @Value("${app.payos.payment.client-id}") String clientId,
            @Value("${app.payos.payment.api-key}") String apiKey,
            @Value("${app.payos.payment.checksum-key}") String checksumKey
    ) {
        return new PayOS(clientId, apiKey, checksumKey);
    }

    @Bean("payoutPayOS")
    public PayOS payoutPayOS(
            @Value("${app.payos.payout.client-id}") String clientId,
            @Value("${app.payos.payout.api-key}") String apiKey,
            @Value("${app.payos.payout.checksum-key}") String checksumKey
    ) {
        return new PayOS(clientId, apiKey, checksumKey);
    }
}
