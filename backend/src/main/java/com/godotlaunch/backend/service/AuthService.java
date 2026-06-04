package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.GitHubLoginRequest;
import com.godotlaunch.backend.dto.request.GoogleLoginRequest;
import com.godotlaunch.backend.dto.request.SignInRequest;
import com.godotlaunch.backend.dto.request.SignUpRequest;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;

public interface AuthService {
    UserResponse signUp(SignUpRequest request);
    JwtAuthenticationResponse signIn(SignInRequest request);
    JwtAuthenticationResponse loginWithGoogle(GoogleLoginRequest request);
    JwtAuthenticationResponse loginWithGitHub(GitHubLoginRequest request);
}
