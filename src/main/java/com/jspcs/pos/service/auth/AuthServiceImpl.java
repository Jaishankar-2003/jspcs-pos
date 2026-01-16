package com.jspcs.pos.service.auth;

import com.jspcs.pos.dto.request.auth.LoginRequest;
import com.jspcs.pos.dto.response.auth.LoginResponse;
import com.jspcs.pos.entity.user.User;
import com.jspcs.pos.exception.model.BusinessException;
import com.jspcs.pos.repository.UserRepository;
import com.jspcs.pos.security.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements IAuthService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    @Override
    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BusinessException("User not found after authentication", "AUTH_ERROR"));

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return LoginResponse.builder()
                .token(jwt)
                .username(user.getUsername())
                .role(user.getRole().getName())
                .expiresAt(LocalDateTime.now().plusHours(8))
                .build();
    }
}
