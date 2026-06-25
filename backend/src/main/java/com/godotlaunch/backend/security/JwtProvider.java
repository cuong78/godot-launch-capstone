package com.godotlaunch.backend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtProvider {

    private final SecretKey key = Keys.hmacShaKeyFor(
        "godot-launch-secure-jwt-secret-key-at-least-256-bits-long-123456"
            .getBytes(StandardCharsets.UTF_8)
    );

    private final long jwtExpirationMs = 86400000; // 24 hours
    private final long jwtRememberMeExpirationMs = 30L * 24 * 60 * 60 * 1000; // 30 days

    /**
     * Tạo JWT nhúng sessionSecret (plain) vào payload.
     * sessionSecret là random UUID — dùng để verify phía server.
     */
    public String generateToken(String username, UUID userId, String role, String sessionSecret) {
        return generateToken(username, userId, role, sessionSecret, false);
    }

    public String generateToken(String username, UUID userId, String role, String sessionSecret, boolean rememberMe) {
        Date now = new Date();
        long expiration = rememberMe ? jwtRememberMeExpirationMs : jwtExpirationMs;
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
            .subject(username)
            .claim("userId", userId.toString())
            .claim("role", role)
            .claim("sessionSecret", sessionSecret)
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(key)
            .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .getSubject();
    }

    public String getRoleFromToken(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .get("role", String.class);
    }

    public UUID getUserIdFromToken(String token) {
        String userIdStr = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .get("userId", String.class);
        return UUID.fromString(userIdStr);
    }

    public String getSessionSecretFromToken(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .get("sessionSecret", String.class);
    }

    /**
     * SHA-256(sessionSecret) → lưu vào DB.
     * Server không lưu plain secret, chỉ lưu hash.
     */
    public static String hashSessionSecret(String sessionSecret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(sessionSecret.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash session secret", e);
        }
    }
}
