package com.jspcs.pos.service.auth;

import com.jspcs.pos.dto.request.auth.LoginRequest;
import com.jspcs.pos.dto.response.auth.LoginResponse;
import com.jspcs.pos.entity.user.User;
import com.jspcs.pos.exception.model.BusinessException;
import com.jspcs.pos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements IAuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BusinessException("Invalid username or password", "AUTH_FAILED"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("Invalid username or password", "AUTH_FAILED");
        }

        if (!user.getIsActive()) {
            throw new BusinessException("User account is inactive", "ACCOUNT_INACTIVE");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // JWT generation logic would go here. For now returning simple response
        // (Simulating token)
        String token = "simulated-jwt-token-" + user.getId();

        return LoginResponse.builder()
                .token(token)
                .username(user.getUsername())
                .role(user.getRole().getName())
                // .permissions(...) map permissions
                .expiresAt(LocalDateTime.now().plusHours(8))
                .build();
    }
}
