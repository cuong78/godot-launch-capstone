package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.dto.response.HomepageResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomepageCacheServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private HomepageCacheService cacheService;

    @Test
    void get_ShouldReturnEmpty_WhenRedisReturnsNull() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("homepage:v2")).thenReturn(null);

        Optional<HomepageResponse> response = cacheService.get();

        assertThat(response).isEmpty();
    }

    @Test
    void get_ShouldReturnResponse_WhenRedisHasValue() throws Exception {
        HomepageResponse mockRes = HomepageResponse.builder().build();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("homepage:v2")).thenReturn("json-string");
        when(objectMapper.readValue("json-string", HomepageResponse.class)).thenReturn(mockRes);

        Optional<HomepageResponse> response = cacheService.get();

        assertThat(response).contains(mockRes);
    }

    @Test
    void get_ShouldReturnEmpty_WhenExceptionThrown() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("homepage:v2")).thenThrow(new RuntimeException("Redis down"));

        Optional<HomepageResponse> response = cacheService.get();

        assertThat(response).isEmpty();
    }

    @Test
    void put_ShouldWriteToRedis() throws Exception {
        HomepageResponse mockRes = HomepageResponse.builder().build();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(objectMapper.writeValueAsString(mockRes)).thenReturn("json-string");

        cacheService.put(mockRes);

        verify(valueOperations, times(1)).set("homepage:v2", "json-string", Duration.ofMinutes(5));
    }

    @Test
    void put_ShouldNotThrowException_WhenExceptionThrown() throws Exception {
        HomepageResponse mockRes = HomepageResponse.builder().build();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(objectMapper.writeValueAsString(mockRes)).thenThrow(new RuntimeException("Mapping error"));

        cacheService.put(mockRes); // should catch exception and not fail
    }

    @Test
    void evict_ShouldDeleteKey() {
        cacheService.evict();
        verify(redisTemplate, times(1)).delete("homepage:v2");
    }

    @Test
    void evict_ShouldNotThrowException_WhenExceptionThrown() {
        doThrow(new RuntimeException("Redis down")).when(redisTemplate).delete("homepage:v2");
        cacheService.evict(); // should catch exception and not fail
    }
}
