package com.godotlaunch.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean success;
    private int status;
    private String code;
    private String message;
    private T data;
    private Map<String, String> errors;

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
            .success(true)
            .status(200)
            .message(message)
            .data(data)
            .build();
    }

    public static <T> ApiResponse<T> error(int status, String message) {
        return ApiResponse.<T>builder()
            .success(false)
            .status(status)
            .message(message)
            .build();
    }

    public static <T> ApiResponse<T> validationError(Map<String, String> errors) {
        return ApiResponse.<T>builder()
            .success(false)
            .status(400)
            .message("Validation failed on input arguments.")
            .errors(errors)
            .build();
    }
}


