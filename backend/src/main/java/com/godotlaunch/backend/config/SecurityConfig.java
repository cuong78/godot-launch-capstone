package com.godotlaunch.backend.config;

import com.godotlaunch.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(
                    "/api/v1/auth/github",
                    "/api/v1/auth/github/callback",
                    "/api/v1/auth/**",
                    "/api/v1/payments/webhook",
                    "/api/auth/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**",
                    "/ws/**"
                ).permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/categories/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/tags/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/community/posts/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/platform-settings/public").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/banners/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/homepage").permitAll()
                // Web demo phải đăng nhập mới chơi được -> khai báo TRƯỚC rule permitAll chung của /api/v1/games/** bên dưới
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/games/*/web-demo/**").authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/games/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Cache-Control"));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

