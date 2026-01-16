package com.jspcs.pos.service.user;

import com.jspcs.pos.dto.request.user.CreateUserRequest;
import com.jspcs.pos.dto.response.user.UserResponse;
import com.jspcs.pos.entity.user.CashierCounter;
import com.jspcs.pos.entity.user.Role;
import com.jspcs.pos.entity.user.User;
import com.jspcs.pos.exception.model.BusinessException;
import com.jspcs.pos.exception.model.EntityNotFoundException;
import com.jspcs.pos.mapper.UserMapper;
import com.jspcs.pos.repository.CashierCounterRepository;
import com.jspcs.pos.repository.RoleRepository;
import com.jspcs.pos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CashierCounterRepository counterRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException("Username already exists", "DUPLICATE_USERNAME");
        }

        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new EntityNotFoundException("Role not found"));

        CashierCounter counter = null;
        if (request.getCashierCounterId() != null) {
            counter = counterRepository.findById(request.getCashierCounterId())
                    .orElseThrow(() -> new EntityNotFoundException("Counter not found"));
        }

        User user = userMapper.toEntity(request);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setCashierCounter(counter);
        user.setIsActive(true);

        user = userRepository.save(user);
        return userMapper.toResponse(user);
    }

    @Override
    public UserResponse getUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return userMapper.toResponse(user);
    }

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toResponse)
                .collect(Collectors.toList());
    }
}
