package com.godotlaunch.backend.security;

import com.godotlaunch.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTH_COOKIE_NAME = "app_token";
    private static final int AUTH_COOKIE_MAX_AGE = 24 * 60 * 60;

    private final JwtProvider jwtProvider;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = resolveToken(request);

        if (StringUtils.hasText(token) && jwtProvider.validateToken(token)) {
            // Step 1: verify chữ ký JWT (standard)
            String username = jwtProvider.getUsernameFromToken(token);
            String role = jwtProvider.getRoleFromToken(token);
            String sessionSecret = jwtProvider.getSessionSecretFromToken(token);

            // Step 2: verify sessionHash so với DB — revoke check
            if (sessionSecret != null) {
                String tokenHash = JwtProvider.hashSessionSecret(sessionSecret);
                boolean isValid = userRepository.findByEmail(username)
                        .map(user -> tokenHash.equals(user.getSessionHash()))
                        .orElse(false);

                if (!isValid) {
                    // Token bị revoke (logout hoặc session mới đã được tạo)
                    log.debug("Token revoked or session expired for user: {}", username);
                    filterChain.doFilter(request, response);
                    return;
                }
            }

            String authority = role.toUpperCase().startsWith("ROLE_") ? role.toUpperCase() : "ROLE_" + role.toUpperCase();
            List<SimpleGrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority(authority));

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    username, null, authorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Browser navigation, iframe and Godot's .js/.wasm/.pck requests cannot
            // attach the SPA's Authorization header. Mirror a valid/revocation-checked
            // Bearer/query token into an HttpOnly cookie so those follow-up requests
            // remain authenticated without exposing the JWT to Web Demo JavaScript.
            syncAuthCookie(request, response, token);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Lấy JWT từ:
     * 1. Authorization: Bearer header (SPA / mobile)
     * 2. query parameter token/access_token (navigation bootstrap)
     * 3. httpOnly cookie "app_token" (iframe/static Web Demo requests)
     */
    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        String tokenParam = request.getParameter("token");
        if (StringUtils.hasText(tokenParam)) {
            return tokenParam;
        }
        String accessTokenParam = request.getParameter("access_token");
        if (StringUtils.hasText(accessTokenParam)) {
            return accessTokenParam;
        }
        if (request.getCookies() != null) {
            return Arrays.stream(request.getCookies())
                    .filter(c -> AUTH_COOKIE_NAME.equals(c.getName()))
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private void syncAuthCookie(HttpServletRequest request, HttpServletResponse response, String token) {
        boolean alreadySynced = request.getCookies() != null && Arrays.stream(request.getCookies())
                .anyMatch(cookie -> AUTH_COOKIE_NAME.equals(cookie.getName()) && token.equals(cookie.getValue()));
        if (alreadySynced) {
            return;
        }

        Cookie cookie = new Cookie(AUTH_COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(request.isSecure());
        cookie.setPath("/");
        cookie.setMaxAge(AUTH_COOKIE_MAX_AGE);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }
}
