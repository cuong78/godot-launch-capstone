package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.GitHubLoginRequest;
import com.godotlaunch.backend.dto.request.GoogleLoginRequest;
import com.godotlaunch.backend.dto.request.SignInRequest;
import com.godotlaunch.backend.dto.request.SignUpRequest;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.entity.User;

import com.godotlaunch.backend.dto.request.ForgotPasswordRequest;
import com.godotlaunch.backend.dto.request.ResetPasswordRequest;
import com.godotlaunch.backend.dto.request.SignupOtpRequest;
import com.godotlaunch.backend.dto.request.VerifyOtpRequest;

public interface AuthService {
    UserResponse signUp(SignUpRequest request);
    JwtAuthenticationResponse signIn(SignInRequest request);
    JwtAuthenticationResponse loginWithGoogle(GoogleLoginRequest request);
    JwtAuthenticationResponse loginWithGitHub(GitHubLoginRequest request);
    void requestPasswordReset(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
    void requestSignupOtp(SignupOtpRequest request);
    void verifySignupOtp(VerifyOtpRequest request);
    void logout(String email);

    // Tạo session/JWT mới phản ánh đúng role hiện tại — dùng khi role user thay đổi
    // giữa phiên (VD: vừa đủ điều kiện lên developer ở KycController.confirmKyc()).
    String refreshSession(User user);
}
