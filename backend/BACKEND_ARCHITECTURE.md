# Godot Launch Backend Architecture Blueprint

This document details the production-ready directory structure, unified API exception handling strategy, and coding standards adopted for the **Godot Launch Capstone Project**.

---

## 📂 1. Directory & Package Structure

The package design follows a domain-driven, layer-separated architecture to ensure maximum maintainability, loose coupling, and clean separation of concerns.

```
com.godotlaunch.backend
│
├── BackendApplication.java           # Main application bootstrapper
│
├── config                             # Global configurations
│   ├── SecurityConfig.java            # Spring Security & CORS configuration
│   ├── OpenApiConfig.java             # Swagger / OpenAPI documentation config
│   ├── JpaAuditingConfig.java         # Enables @CreatedBy, @LastModifiedDate auditing
│   └── WebMvcConfig.java              # Jackson mapping & path matching settings
│
├── constant                           # Global Constants and Error Codes
│   ├── ErrorCode.java                 # Enum containing all structured error codes
│   └── AppConstants.java              # Standard system constants
│
├── controller                         # REST API Entrypoints
│   ├── AuthController.java            # Registration, Login, Token Refresh
│   ├── GameController.java            # Developer game uploads & player downloads
│   └── WalletController.java          # Transactions, deposit, withdrawal requests
│
├── dto                                # Data Transfer Objects (Data validation & projection)
│   ├── request                        # Deserialized request body payloads
│   │   ├── LoginRequest.java          # Login validation payload
│   │   └── GameUploadRequest.java     # Game metadata upload payload
│   └── response                       # Serialized JSON API response structures
│       ├── UserResponse.java          # Filtered user attributes
│       └── GameDetailsResponse.java   # Game detail layout
│
├── entity                             # JPA Database Domain Models (Already completed)
│   ├── User.java
│   ├── Game.java
│   └── enums/                         # Enum types mapping custom PostgreSQL enums
│
├── exception                          # Global Unified Exception Handling
│   ├── AppException.java              # Custom runtime business logic exception
│   ├── ErrorResponse.java             # JSON payload returned to clients on errors
│   └── GlobalExceptionHandler.java    # @RestControllerAdvice capturing system-wide errors
│
├── repository                         # Database Access Layer (Already completed)
│   ├── UserRepository.java
│   └── GameRepository.java
│
└── service                            # Interface-based Business Logic Layer
    ├── UserService.java               # Service Interface (Defines boundaries)
    ├── GameService.java
    ├── mapper                         # Entity-DTO mapping components
    │   └── UserMapper.java            # Performs User <-> UserResponse mappings
    └── impl                           # Encapsulated Business logic implementations
        ├── UserServiceImpl.java       # Concrete implementation of UserService
        └── GameServiceImpl.java
```

---

## 🏛️ 2. Interface-Based Service Design (Service & ServiceImpl)

For realistic, professional applications, business logic **MUST** be split into interfaces (`Service`) and their corresponding implementations (`ServiceImpl`).

### Why use this pattern?
1. **Loose Coupling / Decoupling**: Controllers interact purely with interfaces. The concrete implementation can be swapped out without affecting upper layers.
2. **Dynamic JDK Proxies / AOP**: Spring heavily utilizes dynamic proxies for transaction boundaries (`@Transactional`), security checks, and logging. Interfaces make proxying cleaner.
3. **Multi-Implementations**: If a service needs different strategies (e.g. `PaypalPaymentService` vs `StripePaymentService`), both can implement the same `PaymentService` interface.
4. **Mocking & Unit Testing**: Mocking service interactions during unit testing is cleaner using interfaces.

### 📝 Example Service Contract (`GameService.java`)
```java
package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.GameUploadRequest;
import com.godotlaunch.backend.dto.response.GameDetailsResponse;
import java.util.UUID;

public interface GameService {
    GameDetailsResponse uploadGame(UUID developerId, GameUploadRequest request);
    GameDetailsResponse getGameDetails(UUID gameId);
}
```

### 📝 Example Service Implementation (`GameServiceImpl.java`)
```java
package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.GameUploadRequest;
import com.godotlaunch.backend.dto.response.GameDetailsResponse;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.GameService;
import com.godotlaunch.backend.service.mapper.GameMapper;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameServiceImpl implements GameService {

    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final GameMapper gameMapper;

    @Override
    @Transactional
    public GameDetailsResponse uploadGame(UUID developerId, GameUploadRequest request) {
        User creator = userRepository.findById(developerId)
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Game game = gameMapper.toEntity(request);
        game.setCreator(creator);

        Game savedGame = gameRepository.save(game);
        return gameMapper.toResponse(savedGame);
    }

    @Override
    @Transactional(readOnly = true)
    public GameDetailsResponse getGameDetails(UUID gameId) {
        Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        return gameMapper.toResponse(game);
    }
}
```

---

## 🛡️ 3. Unified API Response & Exception Handling

A real-world project must never expose raw database exceptions or inconsistent error shapes. We establish a unified response wrapper and a global exception handler.

### 📊 A. Unified Response Object (`ApiResponse<T>`)
Every single API response returns the same JSON format to make client parsing extremely simple and structured.

```json
{
  "success": true,
  "message": "Game details retrieved successfully.",
  "data": {
    "id": "f8c3de3d-d58e-49b8-8092-212d1b827364",
    "title": "Astra Legend",
    "status": "published"
  },
  "timestamp": 1716021481021
}
```

On validation failure (e.g. `@NotNull`, `@Email` in DTOs), it returns a clear map of bad properties:
```json
{
  "success": false,
  "message": "Validation failed on input arguments.",
  "errors": {
    "title": "Game title cannot be blank.",
    "priceProposed": "Proposed price must be greater than or equal to 0."
  },
  "timestamp": 1716021481034
}
```

---

### 🎨 B. Code Implementations for Exception Infrastructure

#### 1. Custom Error Registry Enum (`ErrorCode.java`)
Centralized catalog of all possible business logic errors, corresponding HTTP statuses, and client-facing messages.
```java
package com.godotlaunch.backend.constant;

import org.springframework.http.HttpStatus;
import lombok.Getter;

@Getter
public enum ErrorCode {
    // 400 Bad Request
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "GL-4001", "Validation failed on request arguments."),
    DUPLICATE_EMAIL(HttpStatus.BAD_REQUEST, "GL-4002", "Email is already registered."),
    
    // 401 Unauthorized
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "GL-4010", "Full authentication is required to access this resource."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "GL-4011", "Incorrect password or username."),
    
    // 403 Forbidden
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "GL-4030", "You do not have permission to execute this operation."),
    
    // 404 Not Found
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "GL-4041", "Requested user does not exist."),
    GAME_NOT_FOUND(HttpStatus.NOT_FOUND, "GL-4042", "Requested game does not exist."),
    
    // 500 Internal Server Error
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "GL-5000", "An unexpected error occurred. Please try again later.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }
}
```

#### 2. Business Logic Exception Wrapper (`AppException.java`)
Used inside services when business validation fails.
```java
package com.godotlaunch.backend.exception;

import com.godotlaunch.backend.constant.ErrorCode;
import lombok.Getter;

@Getter
public class AppException extends RuntimeException {
    private final ErrorCode errorCode;

    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
```

#### 3. Standard Response Wrapper (`ApiResponse.java`)
```java
package com.godotlaunch.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private Map<String, String> errors;
    private String errorCode;
    @Builder.Default
    private long timestamp = Instant.now().toEpochMilli();

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
            .success(true)
            .message(message)
            .data(data)
            .build();
    }

    public static <T> ApiResponse<T> error(String errorCode, String message) {
        return ApiResponse.<T>builder()
            .success(false)
            .errorCode(errorCode)
            .message(message)
            .build();
    }

    public static <T> ApiResponse<T> validationError(Map<String, String> errors) {
        return ApiResponse.<T>builder()
            .success(false)
            .message("Validation failed on input arguments.")
            .errors(errors)
            .build();
    }
}
```

#### 4. Global Controller interceptor Advice (`GlobalExceptionHandler.java`)
Automatically intercepts all Controller layer exceptions, returning beautifully structured custom responses with accurate HTTP status codes.
```java
package com.godotlaunch.backend.exception;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // 1. Handles custom application business logic exceptions
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        log.warn("Application business exception occurred: [{} - {}]", errorCode.getCode(), ex.getMessage());
        
        ApiResponse<Void> response = ApiResponse.error(errorCode.getCode(), errorCode.getMessage());
        return new ResponseEntity<>(response, errorCode.getHttpStatus());
    }

    // 2. Handles @Valid validation failures for DTO parameters
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        log.warn("DTO Validation failed: {}", errors);
        
        ApiResponse<Void> response = ApiResponse.validationError(errors);
        return ResponseEntity.badRequest().body(response);
    }

    // 3. Fallback handler for all unexpected system exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unexpected internal server error occurred: ", ex);
        
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
        ApiResponse<Void> response = ApiResponse.error(errorCode.getCode(), errorCode.getMessage());
        return new ResponseEntity<>(response, errorCode.getHttpStatus());
    }
}
```
