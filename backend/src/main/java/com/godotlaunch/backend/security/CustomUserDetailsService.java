package com.godotlaunch.backend.security;

import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Map the user role to the spring security role format (e.g. ROLE_ADMIN, ROLE_PLAYER)
        String roleName = user.getRole().getName().toUpperCase();
        String authority = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
        SimpleGrantedAuthority simpleGrantedAuthority = new SimpleGrantedAuthority(authority);

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(),
                Collections.singletonList(simpleGrantedAuthority)
        );
    }
}
