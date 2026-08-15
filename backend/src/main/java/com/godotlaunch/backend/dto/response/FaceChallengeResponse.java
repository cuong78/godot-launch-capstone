package com.godotlaunch.backend.dto.response;

import java.time.Instant;
import java.util.List;

public record FaceChallengeResponse(String challengeId, List<String> actions, Instant expiresAt) {
}
