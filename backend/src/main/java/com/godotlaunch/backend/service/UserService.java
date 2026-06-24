package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.AdminCreateUserRequest;
import com.godotlaunch.backend.dto.request.AdminUpdateUserRequest;
import com.godotlaunch.backend.dto.request.UpdateProfileRequest;
import com.godotlaunch.backend.dto.response.GitHubStatusResponse;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;

import java.util.List;
import java.util.UUID;

public interface UserService {
    List<UserResponse> getAllUsers();
    UserResponse getUserById(UUID id);
    UserResponse getUserByEmail(String email);
    UserResponse createUser(AdminCreateUserRequest request);
    UserResponse updateUser(UUID id, AdminUpdateUserRequest request);
    UserResponse updateMyProfile(String email, UpdateProfileRequest request);
    void deleteUser(UUID id);
    List<UserResponse> searchUsersByName(String query, String excludeEmail);
    GitHubStatusResponse getGitHubStatus(String email);
    JwtAuthenticationResponse unlinkGitHub(String email);
}
