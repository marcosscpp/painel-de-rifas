package br.com.winclub.controller;

import static br.com.winclub.service.Views.*;

import br.com.winclub.dto.Requests.CreateOrder;
import br.com.winclub.integration.PaymentGateway;
import br.com.winclub.service.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api")
public class OrderController {
  private final OrderService orders;
  private final BuyerService buyers;
  private final PaymentGateway gateway;
  private final String webhookToken;

  public OrderController(
      OrderService orders,
      BuyerService buyers,
      PaymentGateway gateway,
      @Value("${app.payment.webhook-token}") String token) {
    this.orders = orders;
    this.buyers = buyers;
    this.gateway = gateway;
    webhookToken = token;
  }

  @PostMapping("/orders")
  @ResponseStatus(HttpStatus.CREATED)
  public Object create(@Valid @RequestBody CreateOrder input, HttpServletRequest req) {
    var b =
        input.buyer() == null
            ? buyers.get(BuyerController.require(req))
            : buyers.register(input.buyer(), true);
    var o = orders.create(input, b);
    if (input.buyer() != null) BuyerController.issue(req, b);
    return orders.view(o, false);
  }

  @GetMapping("/orders/{id}")
  public Object get(@PathVariable String id) {
    return orders.view(orders.get(id), false);
  }

  @PostMapping("/orders/{id}/simulate-payment")
  public Object simulate(@PathVariable String id) {
    return orders.simulate(id);
  }

  @PostMapping("/webhooks/{provider}")
  public Object webhook(
      @PathVariable String provider,
      @RequestHeader(value = "asaas-access-token", defaultValue = "") String token,
      @RequestBody JsonNode body) {
    if (gateway.simulated() || !gateway.name().equalsIgnoreCase(provider))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    if (webhookToken.isBlank()
        || !MessageDigest.isEqual(
            webhookToken.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8)))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    String event = body.path("event").asText("");
    if (!Set.of("PAYMENT_RECEIVED", "PAYMENT_CONFIRMED").contains(event))
      return map("ok", true, "result", "ignored");
    String id = body.path("id").asText(""), charge = body.path("payment").path("id").asText("");
    if (id.isBlank() || id.length() > 100 || charge.isBlank())
      throw new IllegalArgumentException("Evento inválido");
    return map("ok", true, "result", orders.confirm(charge, id));
  }

  @GetMapping("/admin/orders")
  public Object list(
      @RequestParam Map<String, String> query,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int pageSize) {
    orders.expire();
    return page(
        orders.filtered(query).stream().map(o -> orders.view(o, true)).toList(), page, pageSize);
  }

  @GetMapping("/admin/orders/{id}")
  public Object detail(@PathVariable String id) {
    return orders.view(orders.get(id), true);
  }

  @PostMapping("/admin/orders/{id}/cancel")
  public Object cancel(@PathVariable String id) {
    return orders.view(orders.cancel(id), true);
  }

  @PostMapping("/admin/orders/{id}/refunded")
  public Object refunded(@PathVariable String id) {
    return orders.view(orders.refunded(id), true);
  }
}
