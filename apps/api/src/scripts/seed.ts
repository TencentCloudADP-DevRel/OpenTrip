import { createPool } from "../infrastructure/persistence/pool";
import { seedTrips } from "../infrastructure/persistence/seed-data";

/** Load the prototype dataset. Idempotent: upserts by stable ids and rewrites a
 * trip's children on each run. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const pool = createPool(url);
  const client = await pool.connect();

  try {
    for (const { snapshot: t, startLabel, endLabel, coverColor } of seedTrips()) {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO trips (id, title, start_date, end_date, status, currency, cover_color, owner_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title, start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date, status = EXCLUDED.status,
           currency = EXCLUDED.currency, cover_color = EXCLUDED.cover_color`,
        [t.id, t.title, startLabel, endLabel, t.status, t.currency, coverColor, t.ownerId],
      );

      await client.query(`DELETE FROM trip_members WHERE trip_id = $1`, [t.id]);
      await client.query(`DELETE FROM trip_days WHERE trip_id = $1`, [t.id]);
      await client.query(`DELETE FROM stops WHERE trip_id = $1`, [t.id]);
      await client.query(`DELETE FROM expenses WHERE trip_id = $1`, [t.id]);

      for (const [i, m] of t.members.entries()) {
        await client.query(
          `INSERT INTO trip_members (id, trip_id, name, short_name, initials, avatar_bg, avatar_fg, is_current_user, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [m.id, t.id, m.name, m.shortName, m.initials, m.avatarBg, m.avatarFg, m.isCurrentUser, i],
        );
      }
      for (const d of t.days) {
        await client.query(
          `INSERT INTO trip_days (trip_id, number, date_label, city, color) VALUES ($1,$2,$3,$4,$5)`,
          [t.id, d.number, d.dateLabel, d.city, d.color],
        );
      }
      for (const s of t.stops) {
        await client.query(
          `INSERT INTO stops (id, trip_id, day, time, duration, name, area, category, lat, lng, cost, created_by, transit, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [s.id, t.id, s.day, s.time, s.duration, s.name, s.area, s.category, s.lat, s.lng, s.cost, s.createdBy, s.transit, s.order],
        );
        for (const memberId of s.votes) {
          await client.query(
            `INSERT INTO stop_votes (stop_id, member_id) VALUES ($1,$2)`,
            [s.id, memberId],
          );
        }
        for (const c of s.comments) {
          await client.query(
            `INSERT INTO stop_comments (stop_id, author_id, text, time_label) VALUES ($1,$2,$3,$4)`,
            [s.id, c.author, c.text, c.timeLabel],
          );
        }
      }
      for (const e of t.expenses) {
        await client.query(
          `INSERT INTO expenses (id, trip_id, description, payer_id, amount, when_label, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [e.id, t.id, e.description, e.payer, e.amount, e.whenLabel, e.createdOrder],
        );
        for (const memberId of e.participants) {
          await client.query(
            `INSERT INTO expense_participants (expense_id, member_id) VALUES ($1,$2)`,
            [e.id, memberId],
          );
        }
      }

      await client.query("COMMIT");
      console.log(`seeded trip ${t.id}`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
