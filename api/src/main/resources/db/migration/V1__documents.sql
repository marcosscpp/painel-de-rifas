-- Independent schema: never mutates legacy Prisma tables.
CREATE TABLE winclub.documents (
  kind varchar(32) NOT NULL,
  id varchar(100) NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (kind, id)
);
CREATE UNIQUE INDEX raffle_slug ON winclub.documents ((payload->>'slug')) WHERE kind = 'raffle';
CREATE UNIQUE INDEX order_idempotency ON winclub.documents ((payload->>'idempotencyKey')) WHERE kind = 'order';
CREATE INDEX order_raffle ON winclub.documents ((payload->>'raffleId')) WHERE kind = 'order';
CREATE INDEX order_buyer ON winclub.documents ((payload->>'userId')) WHERE kind = 'order';
