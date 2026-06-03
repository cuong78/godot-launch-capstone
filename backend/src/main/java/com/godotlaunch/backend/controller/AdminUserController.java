//package com.godotlaunch.backend.controller;
//
//import com.godotlaunch.backend.dto.request.AdminCreateUserRequest;
//import com.godotlaunch.backend.dto.request.AdminUpdateUserRequest;
//import com.godotlaunch.backend.dto.response.ApiResponse;
//import com.godotlaunch.backend.dto.response.UserResponse;
//import com.godotlaunch.backend.service.UserService;
//import io.swagger.v3.oas.annotations.Operation;
//import io.swagger.v3.oas.annotations.tags.Tag;
//import jakarta.validation.Valid;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.access.prepost.PreAuthorize;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//import java.util.UUID;
//
//@RestController
//@RequestMapping("/api/v1/admin/users")
//@RequiredArgsConstructor
//@PreAuthorize("hasRole('ADMIN')")
//@Tag(name = "Admin User Management API", description = "Endpoints for administrator to perform CRUD operations on users")
//public class AdminUserController {
//
//    private final UserService userService;
//
//    @GetMapping
//    @Operation(summary = "Get all platform users", description = "Returns a list of all registered users on the platform.")
//    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
//        List<UserResponse> users = userService.getAllUsers();
//        return ResponseEntity.ok(ApiResponse.success(users, "Users retrieved successfully."));
//    }
//
//    @GetMapping("/{id}")
//    @Operation(summary = "Get a user by ID", description = "Retrieves details of a specific user by their unique identifier.")
//    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
//        UserResponse user = userService.getUserById(id);
//        return ResponseEntity.ok(ApiResponse.success(user, "User details retrieved successfully."));
//    }
//
//    @PostMapping
//    @Operation(summary = "Create a new user", description = "Allows administrators to manually register a user with any role.")
//    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
//        UserResponse user = userService.createUser(request);
//        return new ResponseEntity<>(ApiResponse.success(user, "User created successfully."), HttpStatus.CREATED);
//    }
//
//    @PutMapping("/{id}")
//    @Operation(summary = "Update user details", description = "Allows administrators to edit a user's full name, role, status, and reset their password.")
//    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
//            @PathVariable UUID id,
//            @Valid @RequestBody AdminUpdateUserRequest request) {
//        UserResponse user = userService.updateUser(id, request);
//        return ResponseEntity.ok(ApiResponse.success(user, "User updated successfully."));
//    }
//
//    @DeleteMapping("/{id}")
//    @Operation(summary = "Delete user (Soft Delete)", description = "Performs a soft delete by setting user status to 'deleted' and suffixing unique fields.")
//    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID id) {
//        userService.deleteUser(id);
//        return ResponseEntity.ok(ApiResponse.success(null, "User soft-deleted successfully."));
//    }
//}
