package br.com.winclub.service;

import static br.com.winclub.service.Views.*;

import br.com.winclub.model.Models.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class AdminService {
  private final OrderService orders;
  private final BuyerService buyers;
  private final RaffleService raffles;

  public AdminService(OrderService orders, BuyerService buyers, RaffleService raffles) {
    this.orders = orders;
    this.buyers = buyers;
    this.raffles = raffles;
  }

  public static String day(Instant time) {
    return time.atZone(ZoneId.of("America/Sao_Paulo")).toLocalDate().toString();
  }

  public Map<String, Object> buyer(Buyer b, boolean detail) {
    var paid =
        orders.all().stream()
            .filter(o -> o.userId.equals(b.id) && o.status.equals("PAID") && !o.refundRequired)
            .toList();
    var out =
        map(
            "id",
            b.id,
            "name",
            b.name,
            "socialName",
            b.socialName,
            "phone",
            b.phone,
            "cpf",
            b.cpf,
            "email",
            b.email,
            "birthDate",
            b.birthDate,
            "createdAt",
            b.createdAt,
            "address",
            b.address,
            "city",
            b.address == null ? null : b.address.get("city"),
            "state",
            b.address == null ? null : b.address.get("state"),
            "paidOrders",
            paid.size(),
            "paidNumbers",
            paid.stream().mapToInt(o -> o.quantity).sum(),
            "spentCents",
            paid.stream().mapToLong(o -> o.totalCents).sum());
    if (detail)
      out.put(
          "orders",
          orders.all().stream()
              .filter(o -> o.userId.equals(b.id))
              .map(o -> orders.view(o, false))
              .toList());
    return out;
  }

  public Map<String, Object> dashboard() {
    orders.expire();
    var all = orders.all();
    var paid = all.stream().filter(o -> o.status.equals("PAID") && !o.refundRequired).toList();
    String today = day(Instant.now());
    var daily = new TreeMap<String, List<Order>>();
    for (Order o : paid)
      if (o.paidAt.isAfter(Instant.now().minusSeconds(30L * 86400)))
        daily.computeIfAbsent(day(o.paidAt), k -> new ArrayList<>()).add(o);
    var todayOrders = paid.stream().filter(o -> day(o.paidAt).equals(today)).toList();
    return map(
        "revenueCents",
        paid.stream().mapToLong(o -> o.subtotalCents).sum(),
        "feesCents",
        paid.stream().mapToLong(o -> o.feeCents).sum(),
        "paidOrders",
        paid.size(),
        "pendingOrders",
        all.stream().filter(o -> o.status.equals("PENDING")).count(),
        "expiredOrders",
        all.stream().filter(o -> Set.of("EXPIRED", "CANCELED").contains(o.status)).count(),
        "refundsPending",
        all.stream().filter(o -> o.refundRequired && o.refundedAt == null).count(),
        "buyers",
        buyers.all().size(),
        "today",
        map(
            "revenueCents",
            todayOrders.stream().mapToLong(o -> o.subtotalCents).sum(),
            "orders",
            todayOrders.size()),
        "daily",
        daily.entrySet().stream()
            .map(
                e ->
                    map(
                        "day",
                        e.getKey(),
                        "orders",
                        e.getValue().size(),
                        "revenueCents",
                        e.getValue().stream().mapToLong(o -> o.subtotalCents).sum()))
            .toList(),
        "raffles",
        raffles.all().stream()
            .filter(r -> Set.of("ACTIVE", "PAUSED", "CLOSED").contains(r.status))
            .map(
                r -> {
                  var view = raffles.view(r, true);
                  view.putAll(raffles.progress(r));
                  var rp = paid.stream().filter(o -> o.raffleId.equals(r.id)).toList();
                  view.put("revenueCents", rp.stream().mapToLong(o -> o.subtotalCents).sum());
                  view.put("paidOrders", rp.size());
                  return view;
                })
            .toList());
  }
}
