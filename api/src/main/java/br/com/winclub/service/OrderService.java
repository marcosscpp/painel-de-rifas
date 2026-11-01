package br.com.winclub.service;

import static br.com.winclub.service.Views.*;

import br.com.winclub.dto.Requests.CreateOrder;
import br.com.winclub.integration.*;
import br.com.winclub.model.Models.*;
import br.com.winclub.repository.DocumentRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {
  private final DocumentRepository db;
  private final RaffleService raffles;
  private final BuyerService buyers;
  private final SettingsService settings;
  private final PaymentGateway gateway;
  private final ImageStorage images;

  public OrderService(
      DocumentRepository db,
      RaffleService raffles,
      BuyerService buyers,
      SettingsService settings,
      PaymentGateway gateway,
      ImageStorage images) {
    this.db = db;
    this.raffles = raffles;
    this.buyers = buyers;
    this.settings = settings;
    this.gateway = gateway;
    this.images = images;
  }

  public List<Order> all() {
    return db.list("order", Order.class).stream()
        .sorted(Comparator.comparing((Order o) -> o.createdAt).reversed())
        .toList();
  }

  public Order get(String id) {
    return db.find("order", id, Order.class)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido não encontrado"));
  }

  public Order create(CreateOrder input, Buyer buyer) {
    Order reserved =
        db.transaction(
            () -> {
              expireInside();
              var existing =
                  all().stream()
                      .filter(o -> o.idempotencyKey.equals(input.idempotencyKey()))
                      .findFirst();
              if (existing.isPresent()) {
                Order o = existing.get();
                if (!o.userId.equals(buyer.id)
                    || !raffles.get(o.raffleId).slug.equals(input.raffleSlug())
                    || (input.quantity() != null && o.quantity != input.quantity())
                    || (input.numbers() != null
                        && !new HashSet<>(o.numbers).equals(new HashSet<>(input.numbers()))))
                  throw new ResponseStatusException(
                      HttpStatus.CONFLICT, "Chave de idempotência utilizada em outro pedido");
                return o;
              }
              Raffle r = raffles.slug(input.raffleSlug());
              Instant now = Instant.now();
              if (!r.status.equals("ACTIVE")
                  || r.startsAt != null && now.isBefore(r.startsAt)
                  || r.endsAt != null && !now.isBefore(r.endsAt))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Vendas indisponíveis");
              if ((input.quantity() == null) == (input.numbers() == null)
                  || (r.saleMode.equals("PICK") != (input.numbers() != null)))
                throw new IllegalArgumentException("Modo de compra inválido");
              int quantity = input.numbers() == null ? input.quantity() : input.numbers().size();
              if (quantity < r.minPerOrder || quantity > r.maxPerOrder)
                throw new IllegalArgumentException("Quantidade inválida");
              Set<Integer> occupied = new HashSet<>();
              for (Order o : all())
                if (o.raffleId.equals(r.id)
                    && !o.refundRequired
                    && Set.of("PENDING", "PAID").contains(o.status)) occupied.addAll(o.numbers);
              List<Integer> picked = new ArrayList<>();
              if (input.numbers() != null) {
                if (new HashSet<>(input.numbers()).size() != quantity
                    || input.numbers().stream().anyMatch(n -> n < 0 || n >= r.totalNumbers))
                  throw new IllegalArgumentException("Números inválidos");
                if (input.numbers().stream().anyMatch(occupied::contains))
                  throw new ResponseStatusException(
                      HttpStatus.CONFLICT, "Alguns números já foram reservados");
                picked.addAll(input.numbers());
              } else {
                if ((long) r.totalNumbers - occupied.size() < quantity)
                  throw new ResponseStatusException(HttpStatus.CONFLICT, "Números insuficientes");
                // Reservoir sampling is bounded even when almost all numbers are sold.
                SecureRandom random = new SecureRandom();
                int seen = 0;
                for (int n = 0; n < r.totalNumbers; n++)
                  if (!occupied.contains(n)) {
                    seen++;
                    if (picked.size() < quantity) picked.add(n);
                    else {
                      int j = random.nextInt(seen);
                      if (j < quantity) picked.set(j, n);
                    }
                  }
              }
              Collections.sort(picked);
              Order o = new Order();
              o.id =
                  UUID.nameUUIDFromBytes(
                          (buyer.id + ":" + input.idempotencyKey())
                              .getBytes(java.nio.charset.StandardCharsets.UTF_8))
                      .toString();
              o.raffleId = r.id;
              o.userId = buyer.id;
              o.idempotencyKey = input.idempotencyKey();
              o.quantity = quantity;
              o.numbers = picked;
              var s = settings.get();
              o.subtotalCents = Math.multiplyExact((long) quantity, r.priceCents);
              o.feeCents = s.pixFeeCents;
              o.totalCents = Math.addExact(o.subtotalCents, o.feeCents);
              o.expiresAt = now.plusSeconds(s.reservationMinutes * 60L);
              db.save("order", o.id, o);
              return o;
            });
    // Persist the reservation before calling the remote gateway. A timeout leaves
    // a durable order that can be retried with the same idempotency key.
    return db.transaction(
        () -> {
          Order o = get(reserved.id);
          if (o.payment == null
              && o.status.equals("PENDING")
              && o.expiresAt.isAfter(Instant.now())) {
            Buyer current = buyers.get(o.userId);
            o.payment = gateway.charge(o, current, raffles.get(o.raffleId).title);
            db.save("buyer", current.id, current);
            db.save("order", o.id, o);
          }
          return o;
        });
  }

  @Scheduled(fixedDelay = 15000)
  public void expire() {
    db.transaction(
        () -> {
          expireInside();
          return null;
        });
  }

  private void expireInside() {
    for (Order o : all())
      if (o.status.equals("PENDING") && !o.expiresAt.isAfter(Instant.now())) {
        o.status = "EXPIRED";
        if (o.payment != null) o.payment.status = "EXPIRED";
        db.save("order", o.id, o);
      }
  }

  public String confirm(String chargeId, String eventId) {
    return db.transaction(
        () -> {
          expireInside();
          if (db.find("webhook", eventId, String.class).isPresent()) return "already-confirmed";
          var found =
              all().stream()
                  .filter(o -> o.payment != null && chargeId.equals(o.payment.providerChargeId))
                  .findFirst();
          if (found.isEmpty()) return "unknown-charge";
          Order o = found.get();
          if (o.payment.status.equals("CONFIRMED") || o.payment.status.equals("REFUNDED")) {
            db.save("webhook", eventId, "processed");
            return "already-confirmed";
          }
          Set<Integer> occupied = new HashSet<>();
          for (Order other : all())
            if (!other.id.equals(o.id)
                && other.raffleId.equals(o.raffleId)
                && !other.refundRequired
                && Set.of("PENDING", "PAID").contains(other.status)) occupied.addAll(other.numbers);
          boolean collision = o.numbers.stream().anyMatch(occupied::contains);
          Raffle r = raffles.get(o.raffleId);
          // A published draw is immutable: late money must be refunded.
          o.refundRequired = collision || r.status.equals("DRAWN");
          o.status = "PAID";
          o.paidAt = Instant.now();
          o.payment.status = "CONFIRMED";
          o.payment.confirmedAt = o.paidAt;
          db.save("order", o.id, o);
          db.save("webhook", eventId, "processed");
          return o.refundRequired ? "refund-required" : "paid";
        });
  }

  public Map<String, Object> simulate(String id) {
    if (!gateway.simulated()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    Order o = get(id);
    String result = confirm(o.payment.providerChargeId, "mock-" + id);
    return map("outcome", result, "order", view(get(id), false));
  }

  public Order cancel(String id) {
    return db.transaction(
        () -> {
          Order o = get(id);
          if (!o.status.equals("PENDING"))
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Só pedidos pendentes podem ser cancelados");
          o.status = "CANCELED";
          if (o.payment != null) o.payment.status = "EXPIRED";
          db.save("order", id, o);
          return o;
        });
  }

  public Order refunded(String id) {
    return db.transaction(
        () -> {
          Order o = get(id);
          if (!o.refundRequired)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sem reembolso pendente");
          o.refundedAt = Instant.now();
          o.payment.status = "REFUNDED";
          db.save("order", id, o);
          return o;
        });
  }

  public Map<String, Object> view(Order o, boolean admin) {
    Raffle r = raffles.get(o.raffleId);
    Buyer b = buyers.get(o.userId);
    String status =
        o.status.equals("PENDING") && !o.expiresAt.isAfter(Instant.now()) ? "EXPIRED" : o.status;
    var raffle =
        map(
            "id",
            r.id,
            "slug",
            r.slug,
            "title",
            r.title,
            "status",
            r.status,
            "totalNumbers",
            r.totalNumbers,
            "priceCents",
            r.priceCents,
            "drawDate",
            r.drawDate,
            "cover",
            images.urls(r.coverKey));
    var buyer =
        map(
            "name",
            b.name,
            "phone",
            admin ? b.phone : BuyerService.mask(b.phone),
            "cpf",
            admin ? b.cpf : BuyerService.mask(b.cpf));
    if (admin)
      buyer.putAll(
          map(
              "id",
              b.id,
              "socialName",
              b.socialName,
              "email",
              b.email,
              "birthDate",
              b.birthDate,
              "address",
              b.address));
    Object payment = null;
    if (o.payment != null) {
      Payment p = o.payment;
      payment =
          map(
              "status",
              status.equals("EXPIRED") && p.status.equals("PENDING") ? "EXPIRED" : p.status,
              "pixCopyPaste",
              status.equals("PENDING") ? p.pixCopyPaste : null,
              "pixQrCodeBase64",
              status.equals("PENDING") ? p.pixQrCodeBase64 : null,
              "canSimulate",
              gateway.simulated() && status.equals("PENDING"),
              "provider",
              p.provider,
              "providerChargeId",
              admin ? p.providerChargeId : null,
              "amountCents",
              p.amountCents,
              "confirmedAt",
              p.confirmedAt);
    }
    return map(
        "id",
        o.id,
        "status",
        status,
        "quantity",
        o.quantity,
        "subtotalCents",
        o.subtotalCents,
        "feeCents",
        o.feeCents,
        "totalCents",
        o.totalCents,
        "expiresAt",
        o.expiresAt,
        "paidAt",
        o.paidAt,
        "createdAt",
        o.createdAt,
        "refundRequired",
        o.refundRequired,
        "refundedAt",
        o.refundedAt,
        "numbers",
        o.numbers,
        "numbersReleased",
        Set.of("EXPIRED", "CANCELED").contains(status) || o.refundRequired,
        "buyer",
        buyer,
        "raffle",
        raffle,
        "payment",
        payment);
  }

  public List<Order> filtered(Map<String, String> q) {
    return all().stream()
        .filter(
            o ->
                (!q.containsKey("status") || o.status.equals(q.get("status")))
                    && (!q.containsKey("raffleId") || o.raffleId.equals(q.get("raffleId")))
                    && (!"true".equals(q.get("refundPending"))
                        || o.refundRequired && o.refundedAt == null))
        .filter(
            o -> {
              String search = q.getOrDefault("q", "").toLowerCase(Locale.ROOT);
              Buyer b = buyers.get(o.userId);
              return search.isBlank()
                  || o.id.contains(search)
                  || b.name.toLowerCase(Locale.ROOT).contains(search)
                  || b.phone.contains(BuyerService.digits(search))
                      && !BuyerService.digits(search).isBlank();
            })
        .toList();
  }
}
