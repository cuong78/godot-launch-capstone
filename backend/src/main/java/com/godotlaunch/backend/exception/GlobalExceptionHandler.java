package com.godotlaunch.backend.exception;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        log.warn("Application business exception occurred: [{} - {}]", errorCode.name(), ex.getMessage());

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .success(false)
                .status(errorCode.getHttpStatus().value())
                .code(errorCode.name())
                .message(errorCode.getMessage())
                .build();
        return new ResponseEntity<>(response, errorCode.getHttpStatus());
    }

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

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMessageNotReadableException(HttpMessageNotReadableException ex) {
        log.warn("Request body could not be parsed: {}", ex.getMessage());

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .success(false)
                .status(HttpStatus.BAD_REQUEST.value())
                .code(ErrorCode.INVALID_INPUT.name())
                .message("Request body contains invalid or incorrectly formatted data.")
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        log.warn("Access denied exception occurred: {}", ex.getMessage());
        ErrorCode errorCode = ErrorCode.ACCESS_DENIED;
        ApiResponse<Void> response = ApiResponse.error(
                errorCode.getHttpStatus().value(),
                errorCode.getMessage()
        );
        return new ResponseEntity<>(response, errorCode.getHttpStatus());
    }

    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(Exception ex) {
        log.warn("Authentication failed: {}", ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error(
                HttpStatus.UNAUTHORIZED.value(),
                "Email hoặc mật khẩu không đúng."
        );
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unexpected internal server error occurred: ", ex);
        
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
        ApiResponse<Void> response = ApiResponse.error(
                errorCode.getHttpStatus().value(),
                errorCode.getMessage()
        );
        return new ResponseEntity<>(response, errorCode.getHttpStatus());
    }
}


