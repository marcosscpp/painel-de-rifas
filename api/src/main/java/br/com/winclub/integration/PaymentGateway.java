package br.com.winclub.integration;

import br.com.winclub.model.Models.*;

public interface PaymentGateway {
  String name();

  Payment charge(Order order, Buyer buyer, String description);

  default boolean simulated() {
    return false;
  }
}
