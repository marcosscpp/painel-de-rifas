package br.com.winclub.service;

import static br.com.winclub.service.Views.map;

import br.com.winclub.dto.Requests.Draw;
import br.com.winclub.model.Models.*;
import br.com.winclub.repository.DocumentRepository;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DrawService {
  private final DocumentRepository db;
  private final RaffleService raffles;
  private final OrderService orders;
  private final BuyerService buyers;

  public DrawService(
      DocumentRepository db, RaffleService raffles, OrderService orders, BuyerService buyers) {
    this.db = db;
    this.raffles = raffles;
    this.orders = orders;
    this.buyers = buyers;
  }

  public Map<String, Object> draw(String id, Draw input, boolean publish) {
    return db.transaction(
        () -> {
          Raffle r = raffles.get(id);
          if (!r.status.equals("CLOSED"))
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Encerre as vendas; o resultado só pode ser publicado uma vez");
          int digits = String.valueOf(r.totalNumbers - 1).length();
          var paid =
              orders.all().stream()
                  .filter(
                      o -> o.raffleId.equals(id) && o.status.equals("PAID") && !o.refundRequired)
                  .toList();
          var steps = new ArrayList<Map<String, Object>>();
          Integer winning = null;
          Order winner = null;
          for (int i = 0; i < 5; i++) {
            String prize = input.prizes().get(i),
                value = digits <= 5 ? prize.substring(5 - digits) : "";
            if (digits > 5) {
              for (int k = 0; k < digits - 5; k++)
                value += input.prizes().get((i + 1 + k) % 5).substring(4);
              value += prize;
            }
            int candidate = Integer.parseInt(value);
            var owner = paid.stream().filter(o -> o.numbers.contains(candidate)).findFirst();
            String outcome =
                winning != null
                    ? "skipped"
                    : candidate >= r.totalNumbers
                        ? "out-of-range"
                        : owner.isEmpty() ? "not-sold" : "winner";
            if (outcome.equals("winner")) {
              winning = candidate;
              winner = owner.get();
            }
            steps.add(
                map(
                    "prize",
                    i + 1,
                    "candidate",
                    candidate,
                    "candidateLabel",
                    String.format("%0" + digits + "d", candidate),
                    "outcome",
                    outcome));
          }
          Buyer b = winner == null ? null : buyers.get(winner.userId);
          String label = winning == null ? null : String.format("%0" + digits + "d", winning);
          String explanation =
              winning == null
                  ? "Nenhum dos 5 prêmios caiu num número vendido: não houve ganhador."
                  : "Número " + label + ", formado pela Loteria Federal.";
          var out =
              map(
                  "raffle",
                  map("id", r.id, "title", r.title, "totalNumbers", r.totalNumbers),
                  "digits",
                  digits,
                  "steps",
                  steps,
                  "method",
                  winning == null ? "none" : "prize",
                  "winningNumber",
                  winning,
                  "winningLabel",
                  label,
                  "explanation",
                  explanation,
                  "winner",
                  b == null
                      ? null
                      : map(
                          "orderId",
                          winner.id,
                          "name",
                          b.name,
                          "phone",
                          b.phone,
                          "phoneMasked",
                          BuyerService.mask(b.phone),
                          "city",
                          b.address == null ? null : b.address.get("city"),
                          "state",
                          b.address == null ? null : b.address.get("state")));
          if (publish) {
            r.status = "DRAWN";
            r.drawnAt = Instant.now();
            String publicName =
                b == null
                    ? null
                    : b.name.split(" ")[0]
                        + " "
                        + (b.name.contains(" ")
                            ? b.name.substring(
                                    b.name.lastIndexOf(' ') + 1, b.name.lastIndexOf(' ') + 2)
                                + "."
                            : "");
            r.result =
                map(
                    "lotteryContest",
                    input.contest(),
                    "lotteryPrizes",
                    input.prizes(),
                    "winningNumber",
                    winning,
                    "explanation",
                    explanation,
                    "winnerName",
                    publicName,
                    "drawnAt",
                    r.drawnAt);
            raffles.save(r);
          }
          return out;
        });
  }
}
