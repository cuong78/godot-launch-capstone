package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.AdminCreateUserRequest;
import com.godotlaunch.backend.dto.request.AdminUpdateUserRequest;
import com.godotlaunch.backend.dto.request.UpdateProfileRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User API", description = "Endpoints for user profile retrieval and administrator user management")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", description = "Retrieves profile details of the currently authenticated user.")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(Principal principal) {
        String email = principal.getName();
        UserResponse user = userService.getUserByEmail(email);
        return ResponseEntity.ok(ApiResponse.success(user, "Current user profile retrieved successfully."));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current user profile", description = "Allows the currently authenticated user to update their own profile information (name, avatar, password).")
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUser(
            Principal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        String email = principal.getName();
        UserResponse updatedUser = userService.updateMyProfile(email, request);
        return ResponseEntity.ok(ApiResponse.success(updatedUser, "Profile updated successfully."));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Get all users (Admin)", description = "Retrieves a list of all registered users on the platform. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users, "Users retrieved successfully."));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID", description = "Retrieves details of a specific user. Requires ADMIN role or user matching the requested ID.")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id, Principal principal) {
        UserResponse user = userService.getUserById(id);
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
        
        if (!isAdmin && !user.getEmail().equalsIgnoreCase(principal.getName())) {
            throw new AccessDeniedException("You do not have permission to view this user's profile.");
        }
        
        return ResponseEntity.ok(ApiResponse.success(user, "User details retrieved successfully."));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Create user (Admin)", description = "Allows administrators to manually register a new user with any role. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        UserResponse user = userService.createUser(request);
        return new ResponseEntity<>(ApiResponse.success(user, "User created successfully."), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Update user (Admin)", description = "Allows administrators to edit a user's role, status, name, and/or reset password. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody AdminUpdateUserRequest request) {
        UserResponse user = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success(user, "User updated successfully."));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Delete user (Admin, Soft Delete)", description = "Soft deletes a user by setting status to inactive and suffixing email. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success(null, "User soft-deleted successfully."));
    }
}
