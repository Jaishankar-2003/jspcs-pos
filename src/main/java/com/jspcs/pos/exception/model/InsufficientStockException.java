package com.jspcs.pos.exception.model;

public class InsufficientStockException extends BusinessException {
    public InsufficientStockException(String message) {
        super(message, "INSUFFICIENT_STOCK");
    }
}
