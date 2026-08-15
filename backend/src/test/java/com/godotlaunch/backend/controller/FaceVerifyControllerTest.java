package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.config.FaceServiceClient;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.FaceVerifyRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.FaceChallengeResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.FaceChallengeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FaceVerifyControllerTest {
    private static final List<String> ACTIONS = List.of(
            "CENTER", "TURN_LEFT", "LOOK_UP", "TURN_RIGHT", "LOOK_DOWN");

    @Mock FaceServiceClient faceServiceClient;
    @Mock UserRepository userRepository;
    @Mock FaceChallengeService faceChallengeService;
    @Mock Principal principal;
    @InjectMocks FaceVerifyController controller;

    private User user;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setName("customer");
        user = new User();
        user.setId(userId);
        user.setEmail("dev@example.com");
        user.setRole(role);
        user.setGithubId("123456");
        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(user));
    }

    @Test
    void getsStatus() {
        ResponseEntity<ApiResponse<Map<String, Boolean>>> response = controller.getFaceVerifyStatus(principal);
        assertThat(response.getBody().getData().get("faceVerified")).isFalse();
    }

    @Test
    void createsRandomChallenge() {
        FaceChallengeResponse challenge = new FaceChallengeResponse("challenge-1", ACTIONS, Instant.now().plusSeconds(90));
        when(faceChallengeService.create(userId)).thenReturn(challenge);
        assertThat(controller.createChallenge(principal).getBody().getData()).isEqualTo(challenge);
    }

    @Test
    void verifiesLivenessAndMarksUser() {
        FaceVerifyRequest request = request();
        when(faceServiceClient.verifyLiveness(eq(userId), eq("challenge-1"), any()))
                .thenReturn(new FaceServiceClient.FaceLivenessResult(true, false, false, "OK"));
        when(userRepository.save(any(User.class))).thenReturn(user);

        ResponseEntity<ApiResponse<Map<String, Boolean>>> response = controller.verifyFace(request, principal);

        assertThat(response.getBody().getData().get("faceVerified")).isTrue();
        assertThat(user.isFaceVerified()).isTrue();
        verify(faceChallengeService).consume(userId, "challenge-1", ACTIONS);
        verify(faceServiceClient).verifyLiveness(eq(userId), eq("challenge-1"), any());
    }

    @Test
    void rejectsDuplicateFace() {
        when(faceServiceClient.verifyLiveness(eq(userId), any(), any()))
                .thenReturn(new FaceServiceClient.FaceLivenessResult(false, true, false, "duplicate"));
        assertThatThrownBy(() -> controller.verifyFace(request(), principal))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.FACE_DUPLICATE);
    }

    @Test
    void failsClosedWhenAiServiceIsUnavailable() {
        when(faceServiceClient.verifyLiveness(eq(userId), any(), any()))
                .thenThrow(new FaceServiceClient.FaceServiceUnavailableException("down"));
        assertThatThrownBy(() -> controller.verifyFace(request(), principal))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.FACE_SERVICE_UNAVAILABLE);
    }

    @Test
    void returnsImmediatelyWhenAlreadyVerified() {
        user.setFaceVerified(true);
        assertThat(controller.verifyFace(request(), principal).getBody().getData().get("faceVerified")).isTrue();
        verifyNoInteractions(faceChallengeService, faceServiceClient);
    }

    private FaceVerifyRequest request() {
        FaceVerifyRequest request = new FaceVerifyRequest();
        request.setChallengeId("challenge-1");
        request.setFrames(ACTIONS.stream().map(action -> {
            FaceVerifyRequest.Frame frame = new FaceVerifyRequest.Frame();
            frame.setAction(action);
            frame.setImageBase64("data:image/jpeg;base64," + "a".repeat(120));
            frame.setCapturedAt(System.currentTimeMillis());
            return frame;
        }).toList());
        return request;
    }
}
