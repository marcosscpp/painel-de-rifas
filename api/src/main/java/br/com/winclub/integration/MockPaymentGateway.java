package br.com.winclub.integration;

import br.com.winclub.model.Models.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("mock & !real")
public class MockPaymentGateway implements PaymentGateway {
  public String name() {
    return "FAKE";
  }

  public boolean simulated() {
    return true;
  }

  public Payment charge(Order o, Buyer b, String description) {
    Payment p = new Payment();
    p.provider = name();
    p.providerChargeId = "mock-" + o.id;
    p.amountCents = o.totalCents;
    p.pixCopyPaste = "SIMULACAO-SEM-VALOR-" + o.id;
    return p;
  }
}
