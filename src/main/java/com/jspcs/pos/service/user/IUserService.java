package com.jspcs.pos.service.user;

import com.jspcs.pos.dto.request.user.CreateUserRequest;
import com.jspcs.pos.dto.response.user.UserResponse;

import java.util.List;
import java.util.UUID;

public interface IUserService {
    UserResponse createUser(CreateUserRequest request);

    UserResponse getUser(UUID id);

    UserResponse getCurrentUser();

    List<UserResponse> getAllUsers();

}
