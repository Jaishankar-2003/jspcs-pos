package com.jspcs.pos.mapper;

import com.jspcs.pos.dto.request.user.CreateUserRequest;
import com.jspcs.pos.dto.response.user.UserResponse;
import com.jspcs.pos.entity.user.CashierCounter;
import com.jspcs.pos.entity.user.Role;
import com.jspcs.pos.entity.user.User;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-01-17T09:04:32+0530",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.45.0.v20260101-2150, environment: Java 21.0.2 (Eclipse Adoptium)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public User toEntity(CreateUserRequest request) {
        if ( request == null ) {
            return null;
        }

        User.UserBuilder<?, ?> user = User.builder();

        user.email( request.getEmail() );
        user.fullName( request.getFullName() );
        user.phone( request.getPhone() );
        user.username( request.getUsername() );

        return user.build();
    }

    @Override
    public UserResponse toResponse(User user) {
        if ( user == null ) {
            return null;
        }

        UserResponse.UserResponseBuilder userResponse = UserResponse.builder();

        userResponse.roleName( userRoleName( user ) );
        userResponse.cashierCounterName( userCashierCounterName( user ) );
        userResponse.createdAt( user.getCreatedAt() );
        userResponse.email( user.getEmail() );
        userResponse.fullName( user.getFullName() );
        userResponse.id( user.getId() );
        userResponse.isActive( user.getIsActive() );
        userResponse.lastLoginAt( user.getLastLoginAt() );
        userResponse.phone( user.getPhone() );
        userResponse.username( user.getUsername() );

        return userResponse.build();
    }

    private String userRoleName(User user) {
        if ( user == null ) {
            return null;
        }
        Role role = user.getRole();
        if ( role == null ) {
            return null;
        }
        String name = role.getName();
        if ( name == null ) {
            return null;
        }
        return name;
    }

    private String userCashierCounterName(User user) {
        if ( user == null ) {
            return null;
        }
        CashierCounter cashierCounter = user.getCashierCounter();
        if ( cashierCounter == null ) {
            return null;
        }
        String name = cashierCounter.getName();
        if ( name == null ) {
            return null;
        }
        return name;
    }
}
