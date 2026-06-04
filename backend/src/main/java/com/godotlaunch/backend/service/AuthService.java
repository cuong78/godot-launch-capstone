package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.SignInRequest;
import com.godotlaunch.backend.dto.request.SignUpRequest;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;

public interface AuthService {
    UserResponse signUp(SignUpRequest request);
    JwtAuthenticationResponse signIn(SignInRequest request);
}
