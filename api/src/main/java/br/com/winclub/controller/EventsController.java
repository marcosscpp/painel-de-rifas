package br.com.winclub.controller;

import static br.com.winclub.service.Views.map;

import br.com.winclub.service.*;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Each connection subscribes to one public raffle or one unguessable order link. */
@RestController
public class EventsController {
  private record Client(
      SseEmitter emitter, String slug, String orderId, Map<Integer, String> previous) {}

  private final List<Client> clients = new CopyOnWriteArrayList<>();
  private final RaffleService raffles;
  private final OrderService orders;

  public EventsController(RaffleService raffles, OrderService orders) {
    this.raffles = raffles;
    this.orders = orders;
  }

  @GetMapping(value = "/api/events", produces = "text/event-stream")
  public SseEmitter subscribe(
      @RequestParam(required = false) String slug, @RequestParam(required = false) String orderId) {
    if ((slug == null) == (orderId == null))
      throw new IllegalArgumentException("Selecione uma assinatura");
    if (slug != null) raffles.slug(slug);
    if (orderId != null) orders.get(orderId);
    SseEmitter emitter = new SseEmitter(300_000L);
    Client client = new Client(emitter, slug, orderId, new HashMap<>());
    clients.add(client);
    emitter.onCompletion(() -> clients.remove(client));
    emitter.onTimeout(
        () -> {
          clients.remove(client);
          emitter.complete();
        });
    emitter.onError(ex -> clients.remove(client));
    return emitter;
  }

  @Scheduled(fixedDelay = 3000)
  public void update() {
    for (Client c : clients)
      try {
        if (c.slug != null) {
          var raffle = raffles.slug(c.slug);
          c.emitter.send(
              SseEmitter.event()
                  .name("raffle:progress")
                  .data(map("slug", c.slug, "progress", raffles.progress(raffle))));
          Map<Integer, String> current = new HashMap<>();
          for (var o : orders.all())
            if (o.raffleId.equals(raffle.id)
                && !o.refundRequired
                && (o.status.equals("PAID")
                    || o.status.equals("PENDING") && o.expiresAt.isAfter(java.time.Instant.now())))
              for (int n : o.numbers) current.put(n, o.status.equals("PAID") ? "PAID" : "RESERVED");
          Set<Integer> changed = new HashSet<>(current.keySet());
          changed.addAll(c.previous.keySet());
          for (String status : List.of("AVAILABLE", "RESERVED", "PAID")) {
            var numbers =
                changed.stream()
                    .filter(
                        n ->
                            !Objects.equals(current.get(n), c.previous.get(n))
                                && current.getOrDefault(n, "AVAILABLE").equals(status))
                    .toList();
            if (!numbers.isEmpty())
              c.emitter.send(
                  SseEmitter.event()
                      .name("raffle:numbers")
                      .data(map("slug", c.slug, "status", status, "numbers", numbers)));
          }
          c.previous.clear();
          c.previous.putAll(current);
        } else {
          var order = orders.get(c.orderId);
          String status = (String) orders.view(order, false).get("status");
          if (!Objects.equals(status, c.previous.get(-1))) {
            c.emitter.send(
                SseEmitter.event()
                    .name("order:status")
                    .data(map("orderId", c.orderId, "status", status)));
            c.previous.put(-1, status);
          } else c.emitter.send(SseEmitter.event().comment("keepalive"));
        }
      } catch (Exception ex) {
        clients.remove(c);
        c.emitter.complete();
      }
  }
}
