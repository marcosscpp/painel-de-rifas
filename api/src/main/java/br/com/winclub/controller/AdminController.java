package br.com.winclub.controller;

import static br.com.winclub.service.Views.page;

import br.com.winclub.service.*;
import java.util.Locale;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private final AdminService admin;
  private final BuyerService buyers;

  public AdminController(AdminService admin, BuyerService buyers) {
    this.admin = admin;
    this.buyers = buyers;
  }

  @GetMapping("/dashboard")
  public Object dashboard() {
    return admin.dashboard();
  }

  @GetMapping("/buyers")
  public Object list(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int pageSize) {
    String search = q.toLowerCase(Locale.ROOT);
    return page(
        buyers.all().stream()
            .filter(
                b ->
                    b.name.toLowerCase(Locale.ROOT).contains(search)
                        || b.phone.contains(search)
                        || b.cpf.contains(search)
                        || b.email.toLowerCase(Locale.ROOT).contains(search))
            .map(b -> admin.buyer(b, false))
            .toList(),
        page,
        pageSize);
  }

  @GetMapping("/buyers/{id}")
  public Object buyer(@PathVariable String id) {
    return admin.buyer(buyers.get(id), true);
  }
}
