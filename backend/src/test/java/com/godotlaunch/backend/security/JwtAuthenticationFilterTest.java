package com.godotlaunch.backend.security;

import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private String validToken;
    private String username;
    private String role;
    private String sessionSecret;
    private String sessionHash;
    private User mockUser;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        validToken = "valid.jwt.token";
        username = "user@example.com";
        role = "CUSTOMER";
        sessionSecret = "secret-uuid-123";
        sessionHash = JwtProvider.hashSessionSecret(sessionSecret);

        mockUser = new User();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail(username);
        mockUser.setSessionHash(sessionHash);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Should authenticate user when valid Bearer token provided in header")
    void shouldAuthenticate_WhenValidBearerTokenHeaderProvided() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn("Bearer " + validToken);
        when(jwtProvider.validateToken(validToken)).thenReturn(true);
        when(jwtProvider.getUsernameFromToken(validToken)).thenReturn(username);
        when(jwtProvider.getRoleFromToken(validToken)).thenReturn(role);
        when(jwtProvider.getSessionSecretFromToken(validToken)).thenReturn(sessionSecret);
        when(userRepository.findByEmail(username)).thenReturn(Optional.of(mockUser));

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo(username);
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_CUSTOMER"));

        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("Should authenticate user when valid app_token provided in cookies")
    void shouldAuthenticate_WhenValidCookieProvided() throws ServletException, IOException {
        // Arrange
        Cookie cookie = new Cookie("app_token", validToken);
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getCookies()).thenReturn(new Cookie[]{cookie});
        when(jwtProvider.validateToken(validToken)).thenReturn(true);
        when(jwtProvider.getUsernameFromToken(validToken)).thenReturn(username);
        when(jwtProvider.getRoleFromToken(validToken)).thenReturn("ROLE_DEVELOPER");
        when(jwtProvider.getSessionSecretFromToken(validToken)).thenReturn(sessionSecret);
        when(userRepository.findByEmail(username)).thenReturn(Optional.of(mockUser));

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_DEVELOPER"));

        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("Should not authenticate and proceed chain when token is revoked (sessionHash mismatch)")
    void shouldNotAuthenticate_WhenTokenIsRevoked() throws ServletException, IOException {
        // Arrange
        mockUser.setSessionHash("different-invalid-hash");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + validToken);
        when(jwtProvider.validateToken(validToken)).thenReturn(true);
        when(jwtProvider.getUsernameFromToken(validToken)).thenReturn(username);
        when(jwtProvider.getRoleFromToken(validToken)).thenReturn(role);
        when(jwtProvider.getSessionSecretFromToken(validToken)).thenReturn(sessionSecret);
        when(userRepository.findByEmail(username)).thenReturn(Optional.of(mockUser));

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("Should proceed chain without authentication when no token is present")
    void shouldProceedChain_WhenNoTokenPresent() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getCookies()).thenReturn(null);

        // Act
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // Assert
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain, times(1)).doFilter(request, response);
    }
}
