package com.godotlaunch.backend.constant;

import org.springframework.http.HttpStatus;
import lombok.Getter;

@Getter
public enum ErrorCode {
    // 400 Bad Request
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "Validation failed on request arguments."),
    DUPLICATE_EMAIL(HttpStatus.BAD_REQUEST, "Email is already registered."),
    DUPLICATE_USERNAME(HttpStatus.BAD_REQUEST, "Username is already taken."),
    ROLE_NOT_FOUND(HttpStatus.BAD_REQUEST, "Specified user role does not exist."),
    PASSWORDS_DO_NOT_MATCH(HttpStatus.BAD_REQUEST, "Passwords do not match."),
    WISHLIST_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "Game is already in your wishlist."),
    DUPLICATE_STEP_ORDER(HttpStatus.BAD_REQUEST, "Step order already exists."),
    
    // 401 Unauthorized
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Full authentication is required to access this resource."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Incorrect password or username."),
    USER_BANNED(HttpStatus.UNAUTHORIZED, "This user account has been banned."),
    
    // 403 Forbidden
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "You do not have permission to execute this operation."),
    
    // 404 Not Found
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "Requested user does not exist."),
    GAME_NOT_FOUND(HttpStatus.NOT_FOUND, "Requested game does not exist."),
    WISHLIST_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "Game is not in your wishlist."),
    GUIDE_NOT_FOUND(HttpStatus.NOT_FOUND, "Requested publishing guide does not exist."),
    
    // 500 Internal Server Error
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.");

    private final HttpStatus httpStatus;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }
}
