package com.godotlaunch.backend.service;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.FaceChallengeResponse;
import com.godotlaunch.backend.exception.AppException;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FaceChallengeService {
    private static final Duration TTL = Duration.ofSeconds(90);
    private static final List<String> MOVEMENTS = List.of(
            "TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN");

    private final ConcurrentHashMap<String, Challenge> challenges = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public FaceChallengeResponse create(UUID userId) {
        challenges.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(Instant.now()));
        List<String> movements = new ArrayList<>(MOVEMENTS);
        Collections.shuffle(movements, random);
        List<String> actions = new ArrayList<>();
        actions.add("CENTER");
        actions.addAll(movements);
        String id = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(TTL);
        challenges.put(id, new Challenge(userId, List.copyOf(actions), expiresAt));
        return new FaceChallengeResponse(id, actions, expiresAt);
    }

    public void consume(UUID userId, String challengeId, List<String> submittedActions) {
        Challenge challenge = challenges.remove(challengeId);
        if (challenge == null || !challenge.userId().equals(userId)) {
            throw new AppException(ErrorCode.FACE_CHALLENGE_INVALID);
        }
        if (challenge.expiresAt().isBefore(Instant.now())) {
            throw new AppException(ErrorCode.FACE_CHALLENGE_EXPIRED);
        }
        if (!challenge.actions().equals(submittedActions)) {
            throw new AppException(ErrorCode.FACE_CHALLENGE_INVALID);
        }
    }

    private record Challenge(UUID userId, List<String> actions, Instant expiresAt) {
    }
}
