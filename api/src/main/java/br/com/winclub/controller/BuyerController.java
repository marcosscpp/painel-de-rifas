package br.com.winclub.controller;

import static br.com.winclub.service.Views.map;

import br.com.winclub.dto.Requests.*;
import br.com.winclub.model.Models.Buyer;
import br.com.winclub.service.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/buyer")
public class BuyerController {
  private final BuyerService buyers;
  private final OrderService orders;

  public BuyerController(BuyerService buyers, OrderService orders) {
    this.buyers = buyers;
    this.orders = orders;
  }

  public static String require(HttpServletRequest req) {
    var s = req.getSession(false);
    String id = s == null ? null : (String) s.getAttribute("buyerId");
    if (id == null)
      throw new ResponseStatusException(
          HttpStatus.UNAUTHORIZED, "Identifique-se com celular e CPF");
    return id;
  }

  public static void issue(HttpServletRequest req, Buyer buyer) {
    if (req.getSession(false) != null) req.changeSessionId();
    req.getSession().setAttribute("buyerId", buyer.id);
  }

  @GetMapping("/me")
  public Object me(HttpServletRequest req) {
    var s = req.getSession(false);
    String id = s == null ? null : (String) s.getAttribute("buyerId");
    return map("buyer", id == null ? null : buyers.publicProfile(buyers.get(id)));
  }

  @PostMapping("/lookup")
  public Object lookup(@Valid @RequestBody Lookup input, HttpServletRequest req) {
    Buyer b = buyers.lookup(input);
    issue(req, b);
    return map("buyer", buyers.publicProfile(b));
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public Object register(@Valid @RequestBody BuyerInput input, HttpServletRequest req) {
    Buyer b = buyers.register(input, false);
    issue(req, b);
    return map("buyer", buyers.publicProfile(b));
  }

  @GetMapping("/profile")
  public Object profile(HttpServletRequest req) {
    return map("profile", buyers.profile(buyers.get(require(req))));
  }

  @PatchMapping("/profile")
  public Object update(@Valid @RequestBody Profile input, HttpServletRequest req) {
    return map("profile", buyers.profile(buyers.update(require(req), input)));
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest req) {
    var s = req.getSession(false);
    if (s != null) s.removeAttribute("buyerId");
  }

  @GetMapping("/orders")
  public Object orders(HttpServletRequest req) {
    String id = require(req);
    return map(
        "buyer",
        buyers.publicProfile(buyers.get(id)),
        "orders",
        orders.all().stream()
            .filter(o -> o.userId.equals(id))
            .map(o -> orders.view(o, false))
            .toList());
  }
}
