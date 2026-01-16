package com.jspcs.pos.service.auth;

import com.jspcs.pos.dto.request.auth.LoginRequest;
import com.jspcs.pos.dto.response.auth.LoginResponse;

public interface IAuthService {
    LoginResponse login(LoginRequest request);
}
