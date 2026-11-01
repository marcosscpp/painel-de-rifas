package br.com.winclub;

import static org.junit.jupiter.api.Assertions.*;

import br.com.winclub.integration.AsaasPaymentGateway;
import br.com.winclub.model.Models.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class AsaasPaymentGatewayTest {
  @Test
  void createsPixAndRecoversExistingChargeWithoutDuplicatePost() throws Exception {
    var customers = new AtomicInteger();
    var payments = new AtomicInteger();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/",
        exchange -> {
          String path = exchange.getRequestURI().getPath(), method = exchange.getRequestMethod();
          assertEquals("api-test", exchange.getRequestHeaders().getFirst("access_token"));
          String body;
          if (path.endsWith("pixQrCode"))
            body = "{\"encodedImage\":\"base64\",\"payload\":\"pix-copy-paste\"}";
          else if (path.equals("/customers") && method.equals("POST")) {
            customers.incrementAndGet();
            body = "{\"id\":\"cus_test\"}";
          } else if (path.equals("/customers")) body = "{\"data\":[]}";
          else if (method.equals("POST")) {
            payments.incrementAndGet();
            body = "{\"id\":\"pay_test\"}";
          } else
            body = payments.get() == 0 ? "{\"data\":[]}" : "{\"data\":[{\"id\":\"pay_test\"}]}";
          byte[] data = body.getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().set("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, data.length);
          exchange.getResponseBody().write(data);
          exchange.close();
        });
    server.start();
    try {
      var gateway =
          new AsaasPaymentGateway(
              "http://127.0.0.1:" + server.getAddress().getPort(),
              "api-test",
              "test-webhook-token-1234567890");
      Order order = new Order();
      order.totalCents = 1234;
      order.expiresAt = Instant.now().plusSeconds(900);
      Buyer buyer = new Buyer();
      buyer.name = "Maria";
      buyer.cpf = "52998224725";
      buyer.phone = "11999999999";
      var first = gateway.charge(order, buyer, "Teste");
      var second = gateway.charge(order, buyer, "Teste");
      assertEquals("pix-copy-paste", first.pixCopyPaste);
      assertEquals(first.providerChargeId, second.providerChargeId);
      assertEquals(1234, first.amountCents);
      assertEquals(1, customers.get());
      assertEquals(1, payments.get());
    } finally {
      server.stop(0);
    }
  }

  @Test
  void rejectsMissingRealCredentials() {
    assertThrows(
        IllegalStateException.class,
        () -> new AsaasPaymentGateway("http://localhost", "", "short"));
  }
}
