package com.jspcs.pos.exception.model;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final String code;

    public BusinessException(String message) {
        super(message);
        this.code = "BUSINESS_ERROR";
    }

    public BusinessException(String message, String code) {
        super(message);
        this.code = code;
    }
}
