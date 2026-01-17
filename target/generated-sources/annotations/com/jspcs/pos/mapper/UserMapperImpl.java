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
    date = "2026-01-17T10:53:51+0530",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.2 (Eclipse Adoptium)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public User toEntity(CreateUserRequest request) {
        if ( request == null ) {
            return null;
        }

        User.UserBuilder<?, ?> user = User.builder();

        user.username( request.getUsername() );
        user.fullName( request.getFullName() );
        user.email( request.getEmail() );
        user.phone( request.getPhone() );

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
        userResponse.id( user.getId() );
        userResponse.username( user.getUsername() );
        userResponse.fullName( user.getFullName() );
        userResponse.email( user.getEmail() );
        userResponse.phone( user.getPhone() );
        userResponse.isActive( user.getIsActive() );
        userResponse.lastLoginAt( user.getLastLoginAt() );
        userResponse.createdAt( user.getCreatedAt() );

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
