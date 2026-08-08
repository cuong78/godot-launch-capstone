package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.dto.response.HomepageResponse;
import com.godotlaunch.backend.utils.TranslationUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class HomepageCacheService {
    private static final String BASE_KEY = "homepage:v2:";
    private static final Duration TTL = Duration.ofMinutes(5);
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private String getKey() {
        return BASE_KEY + TranslationUtils.getLanguage();
    }

    public Optional<HomepageResponse> get() {
        try {
            String value = redisTemplate.opsForValue().get(getKey());
            return value == null ? Optional.empty() : Optional.of(objectMapper.readValue(value, HomepageResponse.class));
        } catch (Exception ex) {
            log.debug("Homepage Redis cache unavailable: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public void put(HomepageResponse response) {
        try {
            redisTemplate.opsForValue().set(getKey(), objectMapper.writeValueAsString(response), TTL);
        } catch (Exception ex) {
            log.debug("Could not write homepage Redis cache: {}", ex.getMessage());
        }
    }

    public void evict() {
        try {
            Set<String> keys = redisTemplate.keys("homepage:v2:*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        }
        catch (Exception ex) { log.debug("Could not evict homepage Redis cache: {}", ex.getMessage()); }
    }
}
