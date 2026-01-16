package com.jspcs.pos.mapper;

import com.jspcs.pos.dto.request.user.CreateUserRequest;
import com.jspcs.pos.dto.response.user.UserResponse;
import com.jspcs.pos.entity.user.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "isActive", ignore = true)
    @Mapping(target = "passwordHash", ignore = true) // Handled manually
    @Mapping(target = "role", ignore = true) // Handled manually
    @Mapping(target = "cashierCounter", ignore = true) // Handled manually
    @Mapping(target = "lastLoginAt", ignore = true)
    User toEntity(CreateUserRequest request);

    @Mapping(target = "roleName", source = "role.name")
    @Mapping(target = "cashierCounterName", source = "cashierCounter.name")
    UserResponse toResponse(User user);
}
