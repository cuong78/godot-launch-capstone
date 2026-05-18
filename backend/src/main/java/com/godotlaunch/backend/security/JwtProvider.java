package com.godotlaunch.backend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtProvider {

    private final SecretKey key = Keys.hmacShaKeyFor(
        "godot-launch-secure-jwt-secret-key-at-least-256-bits-long-123456"
            .getBytes(StandardCharsets.UTF_8)
    );

    private final long jwtExpirationMs = 86400000; // 24 hours

    public String generateToken(String username, UUID userId, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
            .subject(username)
            .claim("userId", userId.toString())
            .claim("role", role)
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(key)
            .compact();
    }
}
