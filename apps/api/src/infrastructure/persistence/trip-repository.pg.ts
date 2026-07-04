import type { Pool } from "pg";
import { Trip } from "../../domain/trip";
import type {
  ExpenseSnapshot,
  StopSnapshot,
  TripRepository,
  TripSnapshot,
  TripStatus,
  TripSummary,
} from "../../domain/trip";

/** PostgreSQL adapter for the Trip aggregate. Loads the whole aggregate on
 * read; on save, rewrites the mutable child rows in a transaction. Members and
 * days are seed-static and not rewritten here. */
export class PgTripRepository implements TripRepository {
  constructor(private pool: Pool) {}

  async findSummaries(): Promise<TripSummary[]> {
    const { rows } = await this.pool.query<{
      id: string;
      title: string;
      start_date: string;
      end_date: string;
      status: string;
      currency: string;
      cover_color: string;
      member_count: string;
      stop_count: string;
    }>(
      `SELECT t.id, t.title, t.start_date, t.end_date, t.status, t.currency, t.cover_color,
              (SELECT count(*) FROM trip_members m WHERE m.trip_id = t.id) AS member_count,
              (SELECT count(*) FROM stops s WHERE s.trip_id = t.id) AS stop_count
       FROM trips t
       ORDER BY t.created_at ASC`,
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      startLabel: r.start_date,
      endLabel: r.end_date,
      status: r.status as TripStatus,
      currency: r.currency,
      coverColor: r.cover_color,
      memberCount: Number(r.member_count),
      stopCount: Number(r.stop_count),
    }));
  }

  async findById(id: string): Promise<Trip | null> {
    const tripRes = await this.pool.query<{
      id: string;
      title: string;
      status: string;
      currency: string;
      owner_id: string;
    }>(
      `SELECT id, title, status, currency, owner_id FROM trips WHERE id = $1`,
      [id],
    );
    const base = tripRes.rows[0];
    if (!base) return null;

    const [members, days, stops, votes, comments, expenses, parts] =
      await Promise.all([
        this.pool.query(
          `SELECT id, name, short_name, initials, avatar_bg, avatar_fg, is_current_user
           FROM trip_members WHERE trip_id = $1 ORDER BY sort_order ASC`,
          [id],
        ),
        this.pool.query(
          `SELECT number, date_label, city, color FROM trip_days WHERE trip_id = $1 ORDER BY number ASC`,
          [id],
        ),
        this.pool.query(
          `SELECT id, day, time, duration, name, area, category, lat, lng, cost, created_by, transit, sort_order
           FROM stops WHERE trip_id = $1 ORDER BY sort_order ASC`,
          [id],
        ),
        this.pool.query(
          `SELECT sv.stop_id, sv.member_id FROM stop_votes sv
           JOIN stops s ON s.id = sv.stop_id WHERE s.trip_id = $1`,
          [id],
        ),
        this.pool.query(
          `SELECT sc.stop_id, sc.author_id, sc.text, sc.time_label FROM stop_comments sc
           JOIN stops s ON s.id = sc.stop_id WHERE s.trip_id = $1 ORDER BY sc.created_at ASC`,
          [id],
        ),
        this.pool.query(
          `SELECT id, description, payer_id, amount, when_label, sort_order
           FROM expenses WHERE trip_id = $1 ORDER BY sort_order ASC`,
          [id],
        ),
        this.pool.query(
          `SELECT ep.expense_id, ep.member_id FROM expense_participants ep
           JOIN expenses e ON e.id = ep.expense_id WHERE e.trip_id = $1`,
          [id],
        ),
      ]);

    const votesByStop = new Map<string, string[]>();
    for (const v of votes.rows as { stop_id: string; member_id: string }[]) {
      const list = votesByStop.get(v.stop_id) ?? [];
      list.push(v.member_id);
      votesByStop.set(v.stop_id, list);
    }
    const commentsByStop = new Map<string, StopSnapshot["comments"]>();
    for (const c of comments.rows as {
      stop_id: string;
      author_id: string;
      text: string;
      time_label: string;
    }[]) {
      const list = commentsByStop.get(c.stop_id) ?? [];
      list.push({ author: c.author_id, timeLabel: c.time_label, text: c.text });
      commentsByStop.set(c.stop_id, list);
    }
    const partsByExpense = new Map<string, string[]>();
    for (const p of parts.rows as { expense_id: string; member_id: string }[]) {
      const list = partsByExpense.get(p.expense_id) ?? [];
      list.push(p.member_id);
      partsByExpense.set(p.expense_id, list);
    }

    const stopSnapshots: StopSnapshot[] = (
      stops.rows as Array<{
        id: string;
        day: number;
        time: string;
        duration: string;
        name: string;
        area: string;
        category: string;
        lat: number;
        lng: number;
        cost: number;
        created_by: string;
        transit: boolean;
        sort_order: number;
      }>
    ).map((s) => ({
      id: s.id,
      day: s.day,
      time: s.time,
      duration: s.duration,
      name: s.name,
      area: s.area,
      category: s.category as StopSnapshot["category"],
      lat: Number(s.lat),
      lng: Number(s.lng),
      cost: Number(s.cost),
      createdBy: s.created_by,
      transit: s.transit,
      order: s.sort_order,
      votes: votesByStop.get(s.id) ?? [],
      comments: commentsByStop.get(s.id) ?? [],
    }));

    const expenseSnapshots: ExpenseSnapshot[] = (
      expenses.rows as Array<{
        id: string;
        description: string;
        payer_id: string;
        amount: number;
        when_label: string;
        sort_order: number;
      }>
    ).map((e) => ({
      id: e.id,
      description: e.description,
      payer: e.payer_id,
      amount: Number(e.amount),
      participants: partsByExpense.get(e.id) ?? [],
      whenLabel: e.when_label,
      createdOrder: e.sort_order,
    }));

    const snapshot: TripSnapshot = {
      id: base.id,
      title: base.title,
      status: base.status as TripStatus,
      currency: base.currency,
      ownerId: base.owner_id,
      members: (members.rows as Array<Record<string, unknown>>).map((m) => ({
        id: m.id as string,
        name: m.name as string,
        shortName: m.short_name as string,
        initials: m.initials as string,
        avatarBg: m.avatar_bg as string,
        avatarFg: m.avatar_fg as string,
        isCurrentUser: m.is_current_user as boolean,
      })),
      days: (days.rows as Array<Record<string, unknown>>).map((d) => ({
        number: d.number as number,
        dateLabel: d.date_label as string,
        city: d.city as string,
        color: d.color as string,
      })),
      stops: stopSnapshots,
      expenses: expenseSnapshots,
    };

    return Trip.fromSnapshot(snapshot);
  }

  async save(trip: Trip): Promise<void> {
    const s = trip.toSnapshot();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM stops WHERE trip_id = $1`, [s.id]);
      await client.query(`DELETE FROM expenses WHERE trip_id = $1`, [s.id]);

      for (const st of s.stops) {
        await client.query(
          `INSERT INTO stops (id, trip_id, day, time, duration, name, area, category, lat, lng, cost, created_by, transit, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            st.id, s.id, st.day, st.time, st.duration, st.name, st.area,
            st.category, st.lat, st.lng, st.cost, st.createdBy, st.transit, st.order,
          ],
        );
        for (const memberId of st.votes) {
          await client.query(
            `INSERT INTO stop_votes (stop_id, member_id) VALUES ($1,$2)`,
            [st.id, memberId],
          );
        }
        for (const c of st.comments) {
          await client.query(
            `INSERT INTO stop_comments (stop_id, author_id, text, time_label)
             VALUES ($1,$2,$3,$4)`,
            [st.id, c.author, c.text, c.timeLabel],
          );
        }
      }

      for (const e of s.expenses) {
        await client.query(
          `INSERT INTO expenses (id, trip_id, description, payer_id, amount, when_label, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [e.id, s.id, e.description, e.payer, e.amount, e.whenLabel, e.createdOrder],
        );
        for (const memberId of e.participants) {
          await client.query(
            `INSERT INTO expense_participants (expense_id, member_id) VALUES ($1,$2)`,
            [e.id, memberId],
          );
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
