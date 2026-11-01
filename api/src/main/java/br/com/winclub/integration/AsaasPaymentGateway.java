package br.com.winclub.integration;

import static br.com.winclub.service.Views.map;

import br.com.winclub.model.Models.*;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@Component
@Profile("real & !mock")
public class AsaasPaymentGateway implements PaymentGateway {
  private final RestClient http;

  public AsaasPaymentGateway(
      @Value("${app.payment.base-url}") String base,
      @Value("${app.payment.api-key}") String key,
      @Value("${app.payment.webhook-token}") String webhook) {
    if (key.isBlank() || webhook.length() < 24)
      throw new IllegalStateException(
          "Configure PAYMENT_API_KEY e PAYMENT_WEBHOOK_TOKEN (mínimo 24 caracteres)");
    var factory =
        new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
    factory.setReadTimeout(Duration.ofSeconds(10));
    http =
        RestClient.builder()
            .baseUrl(base)
            .requestFactory(factory)
            .defaultHeader("access_token", key)
            .defaultHeader("User-Agent", "WinClub/1.0")
            .build();
  }

  public String name() {
    return "ASAAS";
  }

  public Payment charge(Order o, Buyer b, String description) {
    try {
      String customer = b.gatewayCustomerId;
      if (customer == null) {
        JsonNode found =
            http.get()
                .uri(u -> u.path("/customers").queryParam("externalReference", b.id).build())
                .retrieve()
                .body(JsonNode.class)
                .path("data");
        customer =
            found.isEmpty()
                ? http.post()
                    .uri("/customers")
                    .body(
                        map(
                            "name",
                            b.name,
                            "cpfCnpj",
                            b.cpf,
                            "mobilePhone",
                            b.phone,
                            "externalReference",
                            b.id,
                            "notificationDisabled",
                            true))
                    .retrieve()
                    .body(JsonNode.class)
                    .get("id")
                    .asText()
                : found.get(0).get("id").asText();
      }
      JsonNode found =
          http.get()
              .uri(u -> u.path("/payments").queryParam("externalReference", o.id).build())
              .retrieve()
              .body(JsonNode.class)
              .path("data");
      JsonNode charge =
          found.isEmpty()
              ? http.post()
                  .uri("/payments")
                  .body(
                      map(
                          "customer",
                          customer,
                          "billingType",
                          "PIX",
                          "value",
                          BigDecimal.valueOf(o.totalCents, 2),
                          "dueDate",
                          o.expiresAt
                              .atZone(ZoneId.of("America/Sao_Paulo"))
                              .toLocalDate()
                              .toString(),
                          "description",
                          description,
                          "externalReference",
                          o.id))
                  .retrieve()
                  .body(JsonNode.class)
              : found.get(0);
      Payment p = new Payment();
      p.provider = name();
      p.providerChargeId = charge.get("id").asText();
      p.amountCents = o.totalCents;
      JsonNode qr =
          http.get()
              .uri("/payments/{id}/pixQrCode", p.providerChargeId)
              .retrieve()
              .body(JsonNode.class);
      p.pixCopyPaste = qr.get("payload").asText();
      p.pixQrCodeBase64 = qr.get("encodedImage").asText();
      b.gatewayCustomerId = customer;
      return p;
    } catch (RuntimeException ex) {
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "Não foi possível gerar o Pix. Tente novamente.");
    }
  }
}
