import { createServerFn } from "@tanstack/react-start";
import type { Sql } from "@/lib/db";

export type AdminMember = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  paid: boolean;
  referredBy: string | null;
};

export type AdminPayment = {
  id: string;
  payerName: string;
  amount: number;
  status: "pending" | "confirmed" | "rejected";
  createdAt: string;
  memberName: string | null;
  memberEmail: string | null;
  hasReceipt: boolean;
  countsRevenue: boolean;
  confirmedAt: string;
  referredBy: string | null;
  country: "Ghana" | "Nigeria" | null;
};

export type AdminPartner = {
  id: string;
  name: string;
  email: string;
  code: string;
  status: "approved" | "locked" | "pending";
  commission: number;
  referrals: number;
  revenue: number;
  nigeriaRevenue: number;
};

export type MomoWallet = { network: string; number: string; name: string };
export type BankAccount = { bank: string; number: string; name: string };

export type GatewayCheckout = {
  currency: string;
  businessName: string;
  whatsapp: string;
  email: string;
  paystack: boolean;
  flutterwave: boolean;
  royaltech: boolean;
  cowrie: boolean;
  momo: boolean;
  bank: boolean;
  nigeriaOn: boolean;
  nigeriaBanks: BankAccount[];
  wallets: MomoWallet[];
  banks: BankAccount[];
};

export type GatewayRates = {
  nigeria: number;
  kenya: number;
  tanzania: number;
  zambia: number;
  southAfrica: number;
};

export type GatewaySettings = GatewayRates & {
  scansRemaining: number;
  scansUsed: number;
  checkout: GatewayCheckout;
};

export type AdminTestimony = {
  id: string;
  name: string;
  place: string;
  text: string;
  stars: number;
  status: "pending" | "approved";
  createdAt: string;
};

export type AdminSnapshot = {
  members: AdminMember[];
  payments: AdminPayment[];
  partners: AdminPartner[];
  testimonies: AdminTestimony[];
  gateway: GatewaySettings;
  total: number;
  today: number;
  revenue: number;
  confirmed: number;
};

export type PartnerPortal = {
  name: string;
  code: string;
  commission: number;
  members: number;
  active: number;
  todayRevenue: number;
  todaySales: number;
  todayCut: number;
  revenue: number;
  earnings: number;
  nigeriaTodayRevenue: number;
  nigeriaTodaySales: number;
  nigeriaTodayCut: number;
  nigeriaRevenue: number;
  nigeriaEarnings: number;
  days: { label: string; revenue: number; cut: number; today: boolean }[];
  nigeriaDays: { label: string; revenue: number; cut: number; today: boolean }[];
  referrals: {
    name: string;
    email: string;
    status: "paid" | "unpaid";
    joined: string;
    spend: number;
    spendGhs: number;
    spendNgn: number;
    country: "Ghana" | "Nigeria" | null;
  }[];
};

let schemaPromise: Promise<void> | null = null;

export const GHANA_TZ = "Africa/Accra";
export const NIGERIA_TZ = "Africa/Lagos";

export function dayKeyInZone(value: Date | string, timeZone: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftDayKey(key: string, days: number, timeZone: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, (day || 1) + days, 12));
  return dayKeyInZone(date, timeZone);
}

export function isNairaPayment(amount: number, country: string | null | undefined) {
  if (country === "Nigeria") return true;
  if (country === "Ghana") return false;
  return amount === 35000 || amount === 55000 || amount === 75000;
}

export function commissionCut(amount: number, percent: number) {
  return Math.round((amount * percent) / 100);
}

export function liveDayLabel(key: string, timeZone: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12));
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" }).format(date).replace(".", "").toUpperCase();
  const monthName = new Intl.DateTimeFormat("en-GB", { timeZone, month: "short" }).format(date).replace(".", "").toUpperCase();
  return `${weekday} ${day} ${monthName}`;
}

function accraDayKey(value: Date | string) {
  return dayKeyInZone(value, GHANA_TZ);
}

function shiftAccraDay(key: string, days: number) {
  return shiftDayKey(key, days, GHANA_TZ);
}

async function partnerCodeFor(sql: Sql, referredBy: string) {
  const value = referredBy.trim();
  if (!value) return "";
  const rows = await sql<{ code: string }>`
    select code from partners
    where lower(code) = lower(${value}) or lower(name) = lower(${value})
    order by case when lower(code) = lower(${value}) then 0 else 1 end
    limit 1
  `;
  return rows[0]?.code || value;
}

async function ensurePayments(sql: Sql) {
  schemaPromise ??= (async () => {
    await sql`
      create table if not exists payments (
        id text primary key,
        payer_name text not null,
        amount integer not null,
        status text not null default 'pending',
        place text not null default '',
        created_at timestamptz not null default now()
      )
    `;
    await sql`alter table payments add column if not exists user_id text`;
    await sql`alter table payments add column if not exists referred_by text`;
    await sql`alter table payments add column if not exists receipt text`;
    await sql`alter table payments add column if not exists counts_revenue boolean default true`;
    await sql`alter table payments add column if not exists confirmed_at timestamptz`;
    await sql`update payments set counts_revenue = true`;
    await sql`update payments set confirmed_at = created_at where status = 'confirmed' and confirmed_at is null`;
    await sql`
      create table if not exists referrals (
        user_id text primary key,
        referred_by text not null
      )
    `;
    await sql`
      create table if not exists partners (
        id text primary key,
        name text not null,
        email text not null unique,
        password_hash text not null,
        code text not null unique,
        status text not null default 'approved',
        commission integer not null default 0,
        created_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists gateway_settings (
        id text primary key,
        scans_remaining integer not null,
        scans_used integer not null,
        nigeria numeric not null,
        kenya numeric not null,
        tanzania numeric not null,
        zambia numeric not null,
        south_africa numeric not null
      )
    `;
    await sql`alter table gateway_settings add column if not exists checkout text`;
    await sql`alter table gateway_settings add column if not exists blanked boolean default false`;
    await sql`
      create table if not exists testimonies (
        id text primary key,
        name text not null,
        body text not null,
        stars integer not null,
        status text not null default 'pending',
        place text not null default '',
        created_at timestamptz not null default now()
      )
    `;
    await sql`alter table testimonies add column if not exists place text not null default ''`;
    await sql`
      update gateway_settings
      set scans_remaining = 0,
          scans_used = 0,
          nigeria = 0,
          kenya = 0,
          tanzania = 0,
          zambia = 0,
          south_africa = 0,
          checkout = null,
          blanked = true
      where id = 'main' and blanked is not true
    `;
    await sql`
      insert into gateway_settings (id, scans_remaining, scans_used, nigeria, kenya, tanzania, zambia, south_africa)
      values ('main', 0, 0, 0, 0, 0, 0, 0)
      on conflict (id) do nothing
    `;
    await sql`
      create table if not exists sporty_accounts (
        user_id text primary key,
        number text not null
      )
    `;
    await sql`alter table sporty_accounts add column if not exists linked_at timestamptz default now()`;
    await sql`
      create table if not exists player_country (
        user_id text primary key,
        country text not null
      )
    `;
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function readSnapshot(sql: Sql): Promise<AdminSnapshot> {
  await ensurePayments(sql);
  const rows = await sql<{ id: string; name: string; email: string; createdAt: string | Date }>`
    select u.id, u.name, u.email, coalesce(s.linked_at, u."createdAt") as "createdAt"
    from sporty_accounts s
    join "user" u on u.id = s.user_id
    order by coalesce(s.linked_at, u."createdAt") desc
  `;
  const referralRows = await sql<{ user_id: string; referred_by: string }>`
    select user_id, referred_by from referrals
  `;
  const paidRows = await sql<{ user_id: string | null }>`
    select user_id from payments where status = 'confirmed' and user_id is not null
  `;
  const referredBy = new Map(referralRows.map((row) => [row.user_id, row.referred_by]));
  const paidIds = new Set(paidRows.map((row) => row.user_id).filter((id): id is string => Boolean(id)));
  const members: AdminMember[] = rows.map((row) => {
    const created = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: Number.isNaN(created.getTime()) ? "" : created.toISOString(),
      paid: paidIds.has(row.id),
      referredBy: referredBy.get(row.id) ?? null,
    };
  });
  const paymentRows = await sql<{
    id: string;
    payer_name: string;
    amount: number | string;
    status: string;
    created_at: string | Date;
    member_name: string | null;
    member_email: string | null;
    has_receipt: boolean | string;
    counts_revenue: boolean | string | null;
    confirmed_at: string | Date | null;
    referred_by: string | null;
    country: string | null;
  }>`
    select p.id, p.payer_name, p.amount, p.status, p.created_at, u.name as member_name, u.email as member_email,
      (p.receipt is not null and p.receipt <> '') as has_receipt,
      p.counts_revenue,
      coalesce(p.confirmed_at, p.created_at) as confirmed_at,
      coalesce(nullif(p.referred_by, ''), r.referred_by) as referred_by,
      c.country
    from payments p
    left join "user" u on u.id = p.user_id
    left join referrals r on r.user_id = p.user_id
    left join player_country c on c.user_id = p.user_id
    order by p.created_at desc
  `;
  const payments: AdminPayment[] = paymentRows.map((row) => {
    const created = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
    const confirmed = row.confirmed_at instanceof Date ? row.confirmed_at : new Date(row.confirmed_at ?? "");
    const status = row.status === "confirmed" || row.status === "rejected" ? row.status : "pending";
    return {
      id: row.id,
      payerName: row.payer_name,
      amount: Number(row.amount),
      status,
      createdAt: Number.isNaN(created.getTime()) ? "" : created.toISOString(),
      memberName: row.member_name,
      memberEmail: row.member_email,
      hasReceipt: row.has_receipt === true || row.has_receipt === "t" || row.has_receipt === "true",
      countsRevenue: !(row.counts_revenue === false || row.counts_revenue === "f" || row.counts_revenue === "false"),
      confirmedAt: Number.isNaN(confirmed.getTime()) ? "" : confirmed.toISOString(),
      referredBy: row.referred_by,
      country: row.country === "Nigeria" ? "Nigeria" : row.country === "Ghana" ? "Ghana" : null,
    };
  });
  const confirmedPayments = payments.filter((payment) => payment.status === "confirmed");
  const partnerRows = await sql<{
    id: string;
    name: string;
    email: string;
    code: string;
    status: string;
    commission: number | string;
  }>`select id, name, email, code, status, commission from partners order by created_at desc`;
  const referralCounts = await sql<{ referred_by: string; total: number | string }>`
    select lower(referred_by) as referred_by, count(*) as total from referrals group by lower(referred_by)
  `;
  const referralRevenue = await sql<{ referred_by: string; ghs: number | string; ngn: number | string }>`
    select lower(partner.code) as referred_by,
      coalesce(sum(case when
        c.country = 'Nigeria'
        or (c.country is distinct from 'Ghana' and p.amount in (35000, 55000, 75000))
        then 0 else p.amount end), 0) as ghs,
      coalesce(sum(case when
        c.country = 'Nigeria'
        or (c.country is distinct from 'Ghana' and p.amount in (35000, 55000, 75000))
        then p.amount else 0 end), 0) as ngn
    from payments p
    left join referrals r on r.user_id = p.user_id
    left join player_country c on c.user_id = p.user_id
    join lateral (
      select code from partners
      where lower(code) = lower(coalesce(nullif(p.referred_by, ''), ''))
         or lower(name) = lower(coalesce(nullif(p.referred_by, ''), ''))
         or lower(code) = lower(coalesce(r.referred_by, ''))
         or lower(name) = lower(coalesce(r.referred_by, ''))
      order by case
        when lower(code) = lower(coalesce(nullif(p.referred_by, ''), '')) then 0
        when lower(name) = lower(coalesce(nullif(p.referred_by, ''), '')) then 1
        when lower(code) = lower(coalesce(r.referred_by, '')) then 2
        else 3
      end
      limit 1
    ) partner on true
    where p.status = 'confirmed'
    group by lower(partner.code)
  `;
  const countBy = new Map(referralCounts.map((row) => [row.referred_by, Number(row.total)]));
  const ghsBy = new Map(referralRevenue.map((row) => [row.referred_by, Number(row.ghs)]));
  const ngnBy = new Map(referralRevenue.map((row) => [row.referred_by, Number(row.ngn)]));
  const partners: AdminPartner[] = partnerRows.map((row) => {
    const code = row.code.toLowerCase();
    const name = row.name.toLowerCase();
    const extra = (map: Map<string, number>) => (map.get(code) ?? 0) + (code === name ? 0 : (map.get(name) ?? 0));
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      code: row.code,
      status: row.status === "locked" || row.status === "pending" ? row.status : "approved",
      commission: Number(row.commission) || 0,
      referrals: extra(countBy),
      revenue: extra(ghsBy),
      nigeriaRevenue: extra(ngnBy),
    };
  });
  const gatewayRows = await sql<{
    scans_remaining: number | string;
    scans_used: number | string;
    nigeria: number | string;
    kenya: number | string;
    tanzania: number | string;
    zambia: number | string;
    south_africa: number | string;
    checkout: string | null;
  }>`
    select scans_remaining, scans_used, nigeria, kenya, tanzania, zambia, south_africa, checkout
    from gateway_settings where id = 'main'
  `;
  const gatewayRow = gatewayRows[0];
  const checkout = readCheckout(gatewayRow?.checkout);
  const gateway: GatewaySettings = {
    scansRemaining: Number(gatewayRow?.scans_remaining ?? 0),
    scansUsed: Number(gatewayRow?.scans_used ?? 0),
    nigeria: Number(gatewayRow?.nigeria ?? 0),
    kenya: Number(gatewayRow?.kenya ?? 0),
    tanzania: Number(gatewayRow?.tanzania ?? 0),
    zambia: Number(gatewayRow?.zambia ?? 0),
    southAfrica: Number(gatewayRow?.south_africa ?? 0),
    checkout,
  };
  const todayKey = accraDayKey(new Date());
  const today = members.filter((member) => member.createdAt && accraDayKey(member.createdAt) === todayKey).length;
  const testimonyRows = await sql<{
    id: string;
    name: string;
    place: string;
    body: string;
    stars: number | string;
    status: string;
    created_at: string | Date;
  }>`select id, name, place, body, stars, status, created_at from testimonies order by created_at desc`;
  const testimonies: AdminTestimony[] = testimonyRows.map((row) => {
    const created = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
    return {
      id: row.id,
      name: row.name,
      place: row.place,
      text: row.body,
      stars: Math.min(5, Math.max(1, Number(row.stars) || 1)),
      status: row.status === "approved" ? "approved" : "pending",
      createdAt: Number.isNaN(created.getTime()) ? "" : created.toISOString(),
    };
  });
  return {
    members,
    payments,
    partners,
    testimonies,
    gateway,
    total: members.length,
    today,
    revenue: confirmedPayments.reduce((sum, payment) => sum + payment.amount, 0),
    confirmed: confirmedPayments.length,
  };
}

export const getApprovedTestimonies = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await ensurePayments(sql);
  const rows = await sql<{ name: string; place: string; body: string; stars: number | string }>`
    select name, place, body, stars from testimonies where status = 'approved' order by created_at desc
  `;
  return rows.map((row) => ({
    name: row.name,
    place: row.place,
    text: row.body,
    stars: Math.min(5, Math.max(1, Number(row.stars) || 1)),
  }));
});

export const submitTestimony = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; place: string; text: string; stars: number }) => {
    const name = data?.name?.trim() ?? "";
    const place = data?.place?.trim() ?? "";
    const text = data?.text?.trim() ?? "";
    const stars = Number(data?.stars);
    if (name.length < 2) throw new Error("Enter your name.");
    if (place.length < 2) throw new Error("Enter your location.");
    if (text.length < 8) throw new Error("Write a short testimony.");
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error("Choose a star rating.");
    return { name: name.slice(0, 60), place: place.slice(0, 60), text: text.slice(0, 280), stars };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`
      insert into testimonies (id, name, place, body, stars, status)
      values (${crypto.randomUUID()}, ${data.name}, ${data.place}, ${data.text}, ${data.stars}, 'pending')
    `;
    return { ok: true };
  });

export const setTestimonyStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string }) => {
    if (!data?.id) throw new Error("Missing testimony.");
    return { id: data.id, status: data.status === "approved" ? "approved" : "pending" };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`update testimonies set status = ${data.status} where id = ${data.id}`;
    return readSnapshot(sql);
  });

export const deleteTestimony = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Missing testimony.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`delete from testimonies where id = ${data.id}`;
    return readSnapshot(sql);
  });

export const getAdminSnapshot = createServerFn({ method: "GET" }).handler(async (): Promise<AdminSnapshot> => {
  const { getSql } = await import("@/lib/db");
  return readSnapshot(await getSql());
});

export type Storefront = {
  businessName: string;
  whatsapp: string;
  email: string;
  wallets: MomoWallet[];
  banks: BankAccount[];
  nigeriaOn: boolean;
  nigeriaAccounts: BankAccount[];
  rates: { country: string; unit: string; perGhs: number }[];
};

export const getStorefront = createServerFn({ method: "GET" })
  .inputValidator((data?: { rev?: number }) => ({ rev: Number(data?.rev) || 0 }))
  .handler(async (): Promise<Storefront> => {
    const { getSql } = await import("@/lib/db");
    const snapshot = await readSnapshot(await getSql());
    const checkout = snapshot.gateway.checkout;
    const rates = [
      { country: "Nigeria", unit: "₦", perGhs: snapshot.gateway.nigeria },
      { country: "Kenya", unit: "KSh", perGhs: snapshot.gateway.kenya },
      { country: "Tanzania", unit: "TSh", perGhs: snapshot.gateway.tanzania },
      { country: "Zambia", unit: "ZK", perGhs: snapshot.gateway.zambia },
      { country: "South Africa", unit: "R", perGhs: snapshot.gateway.southAfrica },
    ].filter((rate) => rate.perGhs > 0);
    return {
      businessName: checkout.businessName || "Aviator Hack",
      whatsapp: checkout.whatsapp,
      email: checkout.email,
      wallets: checkout.momo ? checkout.wallets.filter((wallet) => wallet.number) : [],
      banks: checkout.bank ? checkout.banks.filter((account) => account.number) : [],
      nigeriaOn: checkout.nigeriaOn,
      nigeriaAccounts: checkout.nigeriaOn ? checkout.nigeriaBanks.filter((account) => account.number) : [],
      rates,
    };
  });

export const getPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Missing payment.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    const rows = await sql<{ status: string }>`select status from payments where id = ${data.id}`;
    const status = rows[0]?.status;
    return { status: status === "confirmed" || status === "rejected" ? status : "pending" };
  });

export const hasPaidAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  if (!user) return { paid: false };
  const sql = await getSql();
  await ensurePayments(sql);
  const rows = await sql<{ id: string }>`
    select id from payments where user_id = ${user.id} and status = 'confirmed' limit 1
  `;
  return { paid: rows.length > 0 };
});

export const recordPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; amount: number; receipt?: string; referredBy?: string }) => {
    const name = data?.name?.trim() ?? "";
    const amount = Number(data?.amount);
    const receipt = typeof data?.receipt === "string" ? data.receipt : "";
    const referredBy = String(data?.referredBy ?? "").trim().slice(0, 80);
    if (name.length < 3) throw new Error("Enter the name on the MoMo number.");
    if (![300, 400, 500, 35000, 55000, 75000].includes(amount)) throw new Error("Unknown package.");
    return { name, amount, receipt, referredBy };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const sql = await getSql();
    const sessionUser = await getSessionUser();
    await ensurePayments(sql);
    let referredBy = "";
    if (sessionUser) {
      const refs = await sql<{ referred_by: string }>`
        select referred_by from referrals where user_id = ${sessionUser.id}
      `;
      referredBy = refs[0]?.referred_by ?? "";
      if (!referredBy && data.referredBy) referredBy = data.referredBy;
    } else if (data.referredBy) {
      referredBy = data.referredBy;
    }
    referredBy = await partnerCodeFor(sql, referredBy);
    if (sessionUser && referredBy) {
      await sql`
        insert into referrals (user_id, referred_by)
        values (${sessionUser.id}, ${referredBy})
        on conflict (user_id) do nothing
      `;
    }
    const id = crypto.randomUUID();
    await sql`
      insert into payments (id, payer_name, amount, status, user_id, referred_by, receipt)
      values (${id}, ${data.name}, ${data.amount}, 'pending', ${sessionUser?.id ?? null}, ${referredBy}, ${data.receipt})
    `;
    return { ok: true, id };
  });

export const getPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Missing payment.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    const rows = await sql<{ receipt: string | null }>`select receipt from payments where id = ${data.id}`;
    return { receipt: rows[0]?.receipt ?? "" };
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing payment.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`update payments set status = 'confirmed', confirmed_at = now() where id = ${data.id} and status = 'pending'`;
    const linked = await sql<{ user_id: string | null; referred_by: string | null }>`
      select user_id, referred_by from payments where id = ${data.id}
    `;
    const payment = linked[0];
    let referredBy = payment?.referred_by?.trim() ?? "";
    if (!referredBy && payment?.user_id) {
      const refs = await sql<{ referred_by: string }>`
        select referred_by from referrals where user_id = ${payment.user_id}
      `;
      referredBy = refs[0]?.referred_by ?? "";
    }
    referredBy = await partnerCodeFor(sql, referredBy);
    if (referredBy) {
      await sql`update payments set referred_by = ${referredBy} where id = ${data.id}`;
    }
    return readSnapshot(sql);
  });

export const rejectPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("Missing payment.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`update payments set status = 'rejected' where id = ${data.id} and status = 'pending'`;
    return readSnapshot(sql);
  });

export const saveReferral = createServerFn({ method: "POST" })
  .inputValidator((data: { referredBy?: string }) => ({ referredBy: (data?.referredBy?.trim() ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    if (!data.referredBy) return { ok: true };
    const { getSql } = await import("@/lib/db");
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (!user) return { ok: false };
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`
      insert into referrals (user_id, referred_by)
      values (${user.id}, ${data.referredBy})
      on conflict (user_id) do nothing
    `;
    return { ok: true };
  });

export const getSportyLink = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  if (!user) {
    return { linked: false, country: null as "Ghana" | "Nigeria" | null, locked: false, signedIn: false, completed: false };
  }
  const sql = await getSql();
  await ensurePayments(sql);
  const linkedRows = await sql<{ user_id: string }>`select user_id from sporty_accounts where user_id = ${user.id}`;
  const countryRows = await sql<{ country: string }>`select country from player_country where user_id = ${user.id}`;
  const country = countryRows[0]?.country === "Nigeria" ? "Nigeria" : countryRows[0]?.country === "Ghana" ? "Ghana" : null;
  const completedRows = await sql<{ completed: boolean }>`
    select "isCompleted" as completed from "user" where id = ${user.id} limit 1
  `;
  const flag = completedRows[0]?.completed as unknown;
  const completed = flag === true || flag === "t" || flag === "true" || flag === 1;
  const linked = linkedRows.length > 0 && completed;
  return { linked, country, locked: linked && country != null, signedIn: true, completed };
});

export const savePlayerCountry = createServerFn({ method: "POST" })
  .inputValidator((data: { country: string }) => {
    const country = data?.country === "Nigeria" ? "Nigeria" : data?.country === "Ghana" ? "Ghana" : "";
    if (!country) throw new Error("Choose Ghana or Nigeria.");
    return { country: country as "Ghana" | "Nigeria" };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in first.");
    const sql = await getSql();
    await ensurePayments(sql);
    const linked = await sql<{ user_id: string }>`select user_id from sporty_accounts where user_id = ${user.id}`;
    const existing = await sql<{ country: string }>`select country from player_country where user_id = ${user.id}`;
    const saved = existing[0]?.country === "Nigeria" ? "Nigeria" : existing[0]?.country === "Ghana" ? "Ghana" : null;
    if (linked.length > 0 && saved) return { country: saved, locked: true };
    await sql`
      insert into player_country (user_id, country)
      values (${user.id}, ${data.country})
      on conflict (user_id) do update set country = excluded.country
    `;
    return { country: data.country, locked: false };
  });

export const abandonUnlinkedAccount = createServerFn({ method: "POST" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  if (!user || user.id === "dev-user") return { removed: false };
  const sql = await getSql();
  await ensurePayments(sql);
  const linked = await sql<{ user_id: string }>`select user_id from sporty_accounts where user_id = ${user.id}`;
  if (linked.length > 0) return { removed: false };
  await sql`delete from referrals where user_id = ${user.id}`;
  await sql`delete from player_country where user_id = ${user.id}`;
  await sql`delete from "user" where id = ${user.id}`;
  return { removed: true };
});

export const saveSportyLink = createServerFn({ method: "POST" })
  .inputValidator((data: { number: string }) => {
    const number = String(data?.number ?? "").replace(/\D/g, "");
    if (!/^0\d{9,10}$/.test(number)) throw new Error("Enter a valid SportyBet number, starting with 0.");
    return { number };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (!user) throw new Error("Sign in before linking SportyBet.");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`
      insert into sporty_accounts (user_id, number, linked_at)
      values (${user.id}, ${data.number}, now())
      on conflict (user_id) do nothing
    `;
    return { linked: true };
  });

export const markAccountCompleted = createServerFn({ method: "POST" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  if (!user) throw new Error("Sign in before linking SportyBet.");
  const sql = await getSql();
  await ensurePayments(sql);
  const marked = await sql<{ id: string }>`
    update "user" u
    set "isCompleted" = true
    where u.id = ${user.id}
      and exists (select 1 from sporty_accounts s where s.user_id = u.id)
      and exists (
        select 1 from player_country c
        where c.user_id = u.id and c.country in ('Ghana', 'Nigeria')
      )
    returning u.id
  `;
  if (!marked[0]?.id) throw new Error("Finish country and SportyBet before opening packages.");
  return { isCompleted: true };
});

function partnerCode(name: string) {
  const base = name.replace(/[^a-z]/gi, "").slice(0, 5).toUpperCase() || "PART";
  return `${base}${Math.floor(100 + Math.random() * 900)}`;
}

async function hashPassword(password: string) {
  const { randomBytes, scryptSync } = await import("node:crypto");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export const addPartner = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string; password: string; code?: string }) => {
    const name = data?.name?.trim() ?? "";
    const email = data?.email?.trim().toLowerCase() ?? "";
    const password = data?.password ?? "";
    const code = (data?.code ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (name.length < 2) throw new Error("Enter the partner name.");
    if (!email.includes("@")) throw new Error("Enter a valid email.");
    if (password.length < 6) throw new Error("Use at least 6 characters.");
    return { name, email, password, code };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    let code = data.code;
    if (!code) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const next = partnerCode(data.name);
        const taken = await sql<{ id: string }>`select id from partners where lower(code) = ${next.toLowerCase()}`;
        if (taken.length === 0) {
          code = next;
          break;
        }
      }
    }
    if (!code) throw new Error("Could not create a referral code.");
    const existing = await sql<{ id: string }>`
      select id from partners where lower(email) = ${data.email} or lower(code) = ${code.toLowerCase()}
    `;
    if (existing.length > 0) throw new Error("That email or referral code is already used.");
    await sql`
      insert into partners (id, name, email, password_hash, code, commission)
      values (${crypto.randomUUID()}, ${data.name}, ${data.email}, ${await hashPassword(data.password)}, ${code}, 0)
    `;
    return readSnapshot(sql);
  });

export const applyPartner = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string; password: string }) => {
    const name = data?.name?.trim() ?? "";
    const email = data?.email?.trim().toLowerCase() ?? "";
    const password = data?.password ?? "";
    if (name.length < 2) throw new Error("Enter your full name.");
    if (!email.includes("@")) throw new Error("Enter a valid email.");
    if (password.length < 6) throw new Error("Use at least 6 characters.");
    return { name, email, password };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`alter table partners add column if not exists token text`;
    const existing = await sql<{ id: string }>`select id from partners where lower(email) = ${data.email}`;
    if (existing.length > 0) throw new Error("That email is already registered.");
    let code = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const next = partnerCode(data.name);
      const taken = await sql<{ id: string }>`select id from partners where lower(code) = ${next.toLowerCase()}`;
      if (taken.length === 0) {
        code = next;
        break;
      }
    }
    if (!code) throw new Error("Could not create a referral code.");
    const token = crypto.randomUUID();
    await sql`
      insert into partners (id, name, email, password_hash, code, status, token, commission)
      values (${crypto.randomUUID()}, ${data.name}, ${data.email}, ${await hashPassword(data.password)}, ${code}, 'pending', ${token}, 0)
    `;
    return { token };
  });

export const getPartnerGate = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => {
    const token = data?.token?.trim() ?? "";
    if (!token) throw new Error("Missing application.");
    return { token };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`alter table partners add column if not exists token text`;
    const rows = await sql<{ status: string }>`select status from partners where token = ${data.token}`;
    const status = rows[0]?.status;
    if (status === "pending" || status === "approved" || status === "locked") return { status };
    return { status: "missing" as const };
  });

export const setPartnerLock = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; locked: boolean }) => {
    if (!data?.id) throw new Error("Missing partner.");
    return { id: data.id, locked: Boolean(data.locked) };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`update partners set status = ${data.locked ? "locked" : "approved"} where id = ${data.id}`;
    return readSnapshot(sql);
  });

export const setPartnerCommission = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; commission: number }) => {
    const commission = Number(data?.commission);
    if (!data?.id) throw new Error("Missing partner.");
    if (!Number.isInteger(commission) || commission < 0 || commission > 100) throw new Error("Enter a commission from 0 to 100.");
    return { id: data.id, commission };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`update partners set commission = ${data.commission} where id = ${data.id}`;
    return readSnapshot(sql);
  });

export const deletePartner = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Missing partner.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`delete from partners where id = ${data.id}`;
    return readSnapshot(sql);
  });

async function passwordMatches(password: string, stored: string) {
  const { scryptSync, timingSafeEqual } = await import("node:crypto");
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export const partnerLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => {
    const email = data?.email?.trim().toLowerCase() ?? "";
    const password = data?.password ?? "";
    if (!email || !password) throw new Error("Enter your email and password.");
    return { email, password };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`alter table partners add column if not exists token text`;
    const rows = await sql<{ id: string; password_hash: string; status: string }>`
      select id, password_hash, status from partners where lower(email) = ${data.email}
    `;
    const partner = rows[0];
    if (!partner || !(await passwordMatches(data.password, partner.password_hash))) {
      throw new Error("Wrong email or password.");
    }
    if (partner.status === "pending") throw new Error("An admin must approve your application before you can sign in.");
    if (partner.status === "locked") throw new Error("This partner account is locked.");
    const token = crypto.randomUUID();
    await sql`update partners set token = ${token} where id = ${partner.id}`;
    return { token };
  });

export const getPartnerPortal = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => {
    const token = data?.token?.trim() ?? "";
    if (!token) throw new Error("Sign in again.");
    return { token };
  })
  .handler(async ({ data }): Promise<PartnerPortal> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`alter table partners add column if not exists token text`;
    const rows = await sql<{ name: string; code: string; status: string; commission: number | string }>`
      select name, code, status, commission from partners where token = ${data.token}
    `;
    const partner = rows[0];
    if (!partner || partner.status !== "approved") throw new Error("Sign in again.");
    const code = partner.code.toLowerCase();
    const name = partner.name.toLowerCase();
    const commission = Number(partner.commission) || 0;
    const memberRows = await sql<{ total: number | string }>`
      select count(*) as total from referrals r
      join sporty_accounts s on s.user_id = r.user_id
      where lower(r.referred_by) = ${code} or lower(r.referred_by) = ${name}
    `;
    const payments = await sql<{ amount: number | string; created_at: string | Date; user_id: string; country: string | null }>`
      select p.amount, coalesce(p.confirmed_at, p.created_at) as created_at, p.user_id, c.country
      from payments p
      left join referrals r on r.user_id = p.user_id
      left join player_country c on c.user_id = p.user_id
      join lateral (
        select code from partners
        where lower(code) = lower(coalesce(nullif(p.referred_by, ''), ''))
           or lower(name) = lower(coalesce(nullif(p.referred_by, ''), ''))
           or lower(code) = lower(coalesce(r.referred_by, ''))
           or lower(name) = lower(coalesce(r.referred_by, ''))
        order by case
          when lower(code) = lower(coalesce(nullif(p.referred_by, ''), '')) then 0
          when lower(name) = lower(coalesce(nullif(p.referred_by, ''), '')) then 1
          when lower(code) = lower(coalesce(r.referred_by, '')) then 2
          else 3
        end
        limit 1
      ) partner on true
      where p.status = 'confirmed'
        and lower(partner.code) = ${code}
    `;
    const cut = (amount: number) => commissionCut(amount, commission);
    const ghanaPayments = payments.filter((row) => !isNairaPayment(Number(row.amount), row.country));
    const nigeriaPayments = payments.filter((row) => isNairaPayment(Number(row.amount), row.country));
    const revenue = ghanaPayments.reduce((sum, row) => sum + Number(row.amount), 0);
    const nigeriaRevenue = nigeriaPayments.reduce((sum, row) => sum + Number(row.amount), 0);
    const now = new Date();
    const ghanaToday = dayKeyInZone(now, GHANA_TZ);
    const nigeriaToday = dayKeyInZone(now, NIGERIA_TZ);
    const todayPayments = ghanaPayments.filter((row) => dayKeyInZone(row.created_at, GHANA_TZ) === ghanaToday);
    const nigeriaTodayPayments = nigeriaPayments.filter((row) => dayKeyInZone(row.created_at, NIGERIA_TZ) === nigeriaToday);
    const todayRevenue = todayPayments.reduce((sum, row) => sum + Number(row.amount), 0);
    const nigeriaTodayRevenue = nigeriaTodayPayments.reduce((sum, row) => sum + Number(row.amount), 0);
    const buildDays = (rows: typeof payments, timeZone: string, todayKey: string) =>
      Array.from({ length: 7 }, (_, index) => {
        const key = shiftDayKey(todayKey, index - 6, timeZone);
        const amount = rows
          .filter((row) => dayKeyInZone(row.created_at, timeZone) === key)
          .reduce((sum, row) => sum + Number(row.amount), 0);
        return {
          label: liveDayLabel(key, timeZone),
          revenue: amount,
          cut: cut(amount),
          today: key === todayKey,
        };
      });
    const days = buildDays(ghanaPayments, GHANA_TZ, ghanaToday);
    const nigeriaDays = buildDays(nigeriaPayments, NIGERIA_TZ, nigeriaToday);
    const spendGhs = new Map<string, number>();
    const spendNgn = new Map<string, number>();
    for (const row of payments) {
      const amount = Number(row.amount);
      const bucket = isNairaPayment(amount, row.country) ? spendNgn : spendGhs;
      bucket.set(row.user_id, (bucket.get(row.user_id) ?? 0) + amount);
    }
    const referred = await sql<{ name: string; email: string; joined: string | Date; user_id: string; country: string | null }>`
      select u.name, u.email, coalesce(s.linked_at, u."createdAt") as joined, r.user_id, c.country
      from referrals r
      join "user" u on u.id = r.user_id
      join sporty_accounts s on s.user_id = r.user_id
      left join player_country c on c.user_id = r.user_id
      where lower(r.referred_by) = ${code} or lower(r.referred_by) = ${name}
      order by coalesce(s.linked_at, u."createdAt") desc
    `;
    const referrals = referred.map((row) => {
      const joinedAt = row.joined instanceof Date ? row.joined : new Date(row.joined);
      const ghs = spendGhs.get(row.user_id) ?? 0;
      const ngn = spendNgn.get(row.user_id) ?? 0;
      const country: "Ghana" | "Nigeria" | null =
        row.country === "Nigeria" ? "Nigeria" : row.country === "Ghana" ? "Ghana" : null;
      return {
        name: row.name,
        email: row.email,
        status: ghs + ngn > 0 ? ("paid" as const) : ("unpaid" as const),
        joined: Number.isNaN(joinedAt.getTime()) ? "" : joinedAt.toISOString(),
        spend: country === "Nigeria" ? ngn : ghs,
        spendGhs: ghs,
        spendNgn: ngn,
        country,
      };
    });
    return {
      name: partner.name,
      code: partner.code,
      commission,
      members: Number(memberRows[0]?.total ?? 0),
      active: new Set(payments.map((row) => row.user_id)).size,
      todayRevenue,
      todaySales: todayPayments.length,
      todayCut: cut(todayRevenue),
      revenue,
      earnings: cut(revenue),
      nigeriaTodayRevenue,
      nigeriaTodaySales: nigeriaTodayPayments.length,
      nigeriaTodayCut: cut(nigeriaTodayRevenue),
      nigeriaRevenue,
      nigeriaEarnings: cut(nigeriaRevenue),
      days,
      nigeriaDays,
      referrals,
    };
  });

export const saveGatewayRates = createServerFn({ method: "POST" })
  .inputValidator((data: GatewayRates) => {
    const rate = (value: number) => {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) throw new Error("Enter a valid rate.");
      return number;
    };
    return {
      nigeria: rate(data?.nigeria),
      kenya: rate(data?.kenya),
      tanzania: rate(data?.tanzania),
      zambia: rate(data?.zambia),
      southAfrica: rate(data?.southAfrica),
    };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`
      update gateway_settings
      set nigeria = ${data.nigeria},
          kenya = ${data.kenya},
          tanzania = ${data.tanzania},
          zambia = ${data.zambia},
          south_africa = ${data.southAfrica}
      where id = 'main'
    `;
    return readSnapshot(sql);
  });

const DEFAULT_CHECKOUT: GatewayCheckout = {
  currency: "GHS",
  businessName: "Aviator Hack",
  whatsapp: "",
  email: "",
  paystack: false,
  flutterwave: false,
  royaltech: false,
  cowrie: false,
  momo: false,
  bank: false,
  nigeriaOn: false,
  nigeriaBanks: [{ bank: "", number: "", name: "" }],
  wallets: [{ network: "Telecel Cash (Vodafone)", number: "", name: "" }],
  banks: [{ bank: "", number: "", name: "" }],
};

function cleanList<T>(value: unknown, map: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(map)
    .slice(0, 6);
}

function readCheckout(value: string | null | undefined): GatewayCheckout {
  if (!value) return DEFAULT_CHECKOUT;
  try {
    const parsed = JSON.parse(value) as Partial<GatewayCheckout>;
    const wallets = cleanList(parsed.wallets, (item) => ({
      network: String(item.network ?? "Telecel Cash (Vodafone)"),
      number: String(item.number ?? ""),
      name: String(item.name ?? ""),
    }));
    const banks = cleanList(parsed.banks, (item) => ({
      bank: String(item.bank ?? ""),
      number: String(item.number ?? ""),
      name: String(item.name ?? ""),
    }));
    const nigeriaBanks = cleanList(parsed.nigeriaBanks, (item) => ({
      bank: String(item.bank ?? ""),
      number: String(item.number ?? ""),
      name: String(item.name ?? ""),
    }));
    return {
      ...DEFAULT_CHECKOUT,
      ...parsed,
      currency: "GHS",
      paystack: Boolean(parsed.paystack),
      flutterwave: Boolean(parsed.flutterwave),
      royaltech: Boolean(parsed.royaltech),
      cowrie: Boolean(parsed.cowrie),
      momo: Boolean(parsed.momo),
      bank: Boolean(parsed.bank),
      nigeriaOn: Boolean(parsed.nigeriaOn),
      wallets: wallets.length > 0 ? wallets : DEFAULT_CHECKOUT.wallets,
      banks: banks.length > 0 ? banks : DEFAULT_CHECKOUT.banks,
      nigeriaBanks: nigeriaBanks.length > 0 ? nigeriaBanks : DEFAULT_CHECKOUT.nigeriaBanks,
    };
  } catch {
    return DEFAULT_CHECKOUT;
  }
}

export const saveGatewayCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: GatewayCheckout) => {
    const whatsapp = String(data?.whatsapp ?? "").replace(/[^\d]/g, "");
    const email = String(data?.email ?? "").trim();
    if (email && !email.includes("@")) throw new Error("Enter a valid support email.");
    return {
      currency: "GHS",
      businessName: String(data?.businessName ?? "").trim().slice(0, 80) || "Aviator Hack",
      whatsapp,
      email,
      paystack: Boolean(data?.paystack),
      flutterwave: Boolean(data?.flutterwave),
      royaltech: Boolean(data?.royaltech),
      cowrie: Boolean(data?.cowrie),
      momo: Boolean(data?.momo),
      bank: Boolean(data?.bank),
      nigeriaOn: Boolean(data?.nigeriaOn),
      wallets: cleanList(data?.wallets, (item) => ({
        network: String(item.network ?? "Telecel Cash (Vodafone)").slice(0, 40),
        number: String(item.number ?? "").replace(/[^\d]/g, "").slice(0, 15),
        name: String(item.name ?? "").trim().slice(0, 80),
      })).filter((item) => item.number || item.name),
      banks: cleanList(data?.banks, (item) => ({
        bank: String(item.bank ?? "").trim().slice(0, 40),
        number: String(item.number ?? "").replace(/[^\d]/g, "").slice(0, 20),
        name: String(item.name ?? "").trim().slice(0, 80),
      })).filter((item) => item.bank || item.number || item.name),
      nigeriaBanks: cleanList(data?.nigeriaBanks, (item) => ({
        bank: String(item.bank ?? "").trim().slice(0, 40),
        number: String(item.number ?? "").replace(/[^\d]/g, "").slice(0, 20),
        name: String(item.name ?? "").trim().slice(0, 80),
      })).filter((item) => item.bank || item.number || item.name),
    };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePayments(sql);
    await sql`update gateway_settings set checkout = ${JSON.stringify(data)} where id = 'main'`;
    return readSnapshot(sql);
  });
