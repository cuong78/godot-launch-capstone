package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.dto.response.HomepageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class HomepageCacheService {
    private static final String KEY = "homepage:v2";
    private static final Duration TTL = Duration.ofMinutes(5);
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public Optional<HomepageResponse> get() {
        try {
            String value = redisTemplate.opsForValue().get(KEY);
            return value == null ? Optional.empty() : Optional.of(objectMapper.readValue(value, HomepageResponse.class));
        } catch (Exception ex) {
            log.debug("Homepage Redis cache unavailable: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public void put(HomepageResponse response) {
        try {
            redisTemplate.opsForValue().set(KEY, objectMapper.writeValueAsString(response), TTL);
        } catch (Exception ex) {
            log.debug("Could not write homepage Redis cache: {}", ex.getMessage());
        }
    }

    public void evict() {
        try { redisTemplate.delete(KEY); }
        catch (Exception ex) { log.debug("Could not evict homepage Redis cache: {}", ex.getMessage()); }
    }
}
