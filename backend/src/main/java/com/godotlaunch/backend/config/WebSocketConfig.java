package com.godotlaunch.backend.config;

import com.godotlaunch.backend.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Collections;

@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtProvider jwtProvider;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple memory-based message broker to carry messages to clients on destinations prefixed with /topic or /queue
        config.enableSimpleBroker("/topic", "/queue");
        
        // Prefix for messages that are bound for methods annotated with @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
        
        // Prefix for user-specific queues (/user/{username}/queue/...)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // HTTP URL endpoint for WebSocket handshake and SockJS fallback configuration
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    log.info("[WS Conn] CONNECT frame received.");
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader == null) {
                        authHeader = accessor.getFirstNativeHeader("authorization");
                    }
                    log.info("[WS Conn] Auth header found: {}, prefix match: {}", 
                            authHeader != null, 
                            authHeader != null && authHeader.startsWith("Bearer "));
                    String token = null;
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        token = authHeader.substring(7);
                    }
                    
                    if (token != null && jwtProvider.validateToken(token)) {
                        try {
                            String email = jwtProvider.getUsernameFromToken(token);
                            log.info("[WS Conn] Token validated successfully for email: {}", email);
                            
                            String role = jwtProvider.getRoleFromToken(token);
                            String authority = role.toUpperCase().startsWith("ROLE_") ? role.toUpperCase() : "ROLE_" + role.toUpperCase();
                            SimpleGrantedAuthority simpleGrantedAuthority = new SimpleGrantedAuthority(authority);
                            
                            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                    email, null, Collections.singletonList(simpleGrantedAuthority)
                            );
                            accessor.setUser(authentication);
                            log.info("[WS Conn] User successfully authenticated: {}", email);
                        } catch (Exception e) {
                            log.error("[WS Conn] User authentication exception: {}", e.getMessage(), e);
                            throw new org.springframework.messaging.MessageDeliveryException("WebSocket authentication failed: " + e.getMessage());
                        }
                    } else {
                        log.warn("[WS Conn] Token validation failed. Token is null or invalid: {}", token == null ? "null" : "invalid");
                        throw new org.springframework.messaging.MessageDeliveryException("WebSocket authentication failed: invalid or missing token");
                    }
                }
                return message;
            }
        });
    }
}
