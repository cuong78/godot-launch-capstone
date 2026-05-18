package com.godotlaunch.backend.constant;

import org.springframework.http.HttpStatus;
import lombok.Getter;

@Getter
public enum ErrorCode {
    // 400 Bad Request
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "GL-4001", "Validation failed on request arguments."),
    DUPLICATE_EMAIL(HttpStatus.BAD_REQUEST, "GL-4002", "Email is already registered."),
    DUPLICATE_USERNAME(HttpStatus.BAD_REQUEST, "GL-4003", "Username is already taken."),
    ROLE_NOT_FOUND(HttpStatus.BAD_REQUEST, "GL-4004", "Specified user role does not exist."),
    PASSWORDS_DO_NOT_MATCH(HttpStatus.BAD_REQUEST, "GL-4005", "Passwords do not match."),
    
    // 401 Unauthorized
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "GL-4010", "Full authentication is required to access this resource."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "GL-4011", "Incorrect password or username."),
    USER_BANNED(HttpStatus.UNAUTHORIZED, "GL-4012", "This user account has been banned."),
    
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
