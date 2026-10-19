-- =====================================================================
-- MinVa · 2026-10-19 · Vague 1 des sites clients
-- Dons Mobile Money, agenda et inscriptions, « Devenir membre »,
-- statistiques de visite. Ajoute des tables, n'efface rien.
-- Peut être relancé sans risque.
-- =====================================================================

-- ---------- 1. Dons déclarés par les visiteurs ----------
-- MinVa ne touche jamais l'argent : le visiteur paie par Mobile Money,
-- puis déclare son don ; l'organisation le confirme.
create table if not exists dons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  projet_id uuid references projets(id) on delete set null,
  nom text not null default '' check (char_length(nom) <= 80),
  anonyme boolean not null default false,
  telephone text not null default '' check (char_length(telephone) <= 40),
  montant bigint not null check (montant > 0 and montant <= 100000000),
  moyen text not null default 'orange' check (moyen in ('orange','mtn','moov','wave','autre')),
  message text not null default '' check (char_length(message) <= 300),
  statut text not null default 'declare' check (statut in ('declare','confirme','refuse')),
  created_at timestamptz not null default now()
);
create index if not exists dons_org_date on dons (org_id, created_at desc);
alter table dons enable row level security;

drop policy if exists dons_envoi on dons;
create policy dons_envoi on dons for insert to anon, authenticated
  with check (statut = 'declare' and org_active(org_id)
    and (projet_id is null or exists (select 1 from projets p where p.id = projet_id and p.org_id = dons.org_id)));
drop policy if exists dons_lecture on dons;
create policy dons_lecture on dons for select using (org_id = mon_org_id() or dev_a_acces(org_id));
drop policy if exists dons_gestion on dons;
create policy dons_gestion on dons for update using (org_id = mon_org_id()) with check (org_id = mon_org_id());
drop policy if exists dons_suppression on dons;
create policy dons_suppression on dons for delete using (org_id = mon_org_id());

-- Un don confirmé fait avancer la barre de collecte du projet (et recule s'il est annulé)
create or replace function dons_collecte() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_avant boolean; v_apres boolean;
begin
  v_avant := tg_op <> 'INSERT' and old.statut = 'confirme';
  v_apres := tg_op <> 'DELETE' and new.statut = 'confirme';
  if v_avant and old.projet_id is not null then
    update projets set collecte = greatest(0, collecte - old.montant), donateurs = greatest(0, donateurs - 1)
      where id = old.projet_id and org_id = old.org_id;
  end if;
  if v_apres and new.projet_id is not null then
    update projets set collecte = collecte + new.montant, donateurs = donateurs + 1
      where id = new.projet_id and org_id = new.org_id;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists t_dons_collecte on dons;
create trigger t_dons_collecte after insert or update or delete on dons
  for each row execute function dons_collecte();

-- Le mur des donateurs : seulement les dons confirmés, jamais le téléphone
create or replace view dons_publics as
  select d.id, d.org_id, d.projet_id, case when d.anonyme then '' else d.nom end as nom,
         d.montant, d.message, d.created_at
  from dons d join organisations o on o.id = d.org_id
  where d.statut = 'confirme' and o.actif;

-- ---------- 2. Agenda et inscriptions ----------
create table if not exists evenements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  titre text not null check (char_length(titre) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1500),
  debut timestamptz not null,
  fin timestamptz,
  lieu text not null default '' check (char_length(lieu) <= 160),
  places int check (places is null or places > 0),
  inscriptions boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists evenements_org_debut on evenements (org_id, debut);
alter table evenements enable row level security;
drop policy if exists evt_lecture on evenements;
create policy evt_lecture on evenements for select using (org_active(org_id) or org_id = mon_org_id() or est_developpeur());
drop policy if exists evt_ecriture on evenements;
create policy evt_ecriture on evenements for all
  using (org_id = mon_org_id() or dev_a_acces(org_id, true))
  with check (org_id = mon_org_id() or dev_a_acces(org_id, true));

create table if not exists inscriptions (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references evenements(id) on delete cascade,
  org_id uuid not null references organisations(id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 80),
  telephone text not null check (char_length(telephone) between 1 and 40),
  nombre int not null default 1 check (nombre between 1 and 20),
  created_at timestamptz not null default now()
);
create index if not exists inscriptions_evt on inscriptions (evenement_id);
alter table inscriptions enable row level security;
drop policy if exists insc_envoi on inscriptions;
create policy insc_envoi on inscriptions for insert to anon, authenticated
  with check (org_active(org_id) and exists (
    select 1 from evenements e where e.id = evenement_id and e.org_id = inscriptions.org_id
      and e.inscriptions and coalesce(e.fin, e.debut) > now()));
drop policy if exists insc_lecture on inscriptions;
create policy insc_lecture on inscriptions for select using (org_id = mon_org_id() or dev_a_acces(org_id));
drop policy if exists insc_suppression on inscriptions;
create policy insc_suppression on inscriptions for delete using (org_id = mon_org_id());

-- Jamais plus d'inscrits que de places
create or replace function inscriptions_places() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_places int; v_pris int;
begin
  select places into v_places from evenements where id = new.evenement_id for update;
  if v_places is not null then
    select coalesce(sum(nombre), 0) into v_pris from inscriptions where evenement_id = new.evenement_id;
    if v_pris + new.nombre > v_places then raise exception 'Complet : il ne reste plus assez de places.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists t_inscriptions_places on inscriptions;
create trigger t_inscriptions_places before insert on inscriptions
  for each row execute function inscriptions_places();

-- Agenda public avec le nombre d'inscrits (jamais leurs noms)
create or replace view evenements_publics as
  select e.id, e.org_id, e.titre, e.description, e.debut, e.fin, e.lieu, e.places, e.inscriptions, e.created_at,
         coalesce((select sum(i.nombre) from inscriptions i where i.evenement_id = e.id), 0)::int as inscrits
  from evenements e join organisations o on o.id = e.org_id
  where o.actif;

-- ---------- 3. Devenir membre ----------
create table if not exists adhesions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 80),
  telephone text not null check (char_length(telephone) between 1 and 40),
  email text not null default '' check (char_length(email) <= 120),
  ville text not null default '' check (char_length(ville) <= 80),
  message text not null default '' check (char_length(message) <= 500),
  statut text not null default 'nouvelle' check (statut in ('nouvelle','acceptee','refusee')),
  created_at timestamptz not null default now()
);
create index if not exists adhesions_org_date on adhesions (org_id, created_at desc);
alter table adhesions enable row level security;
drop policy if exists adh_envoi on adhesions;
create policy adh_envoi on adhesions for insert to anon, authenticated with check (statut = 'nouvelle' and org_active(org_id));
drop policy if exists adh_lecture on adhesions;
create policy adh_lecture on adhesions for select using (org_id = mon_org_id() or dev_a_acces(org_id));
drop policy if exists adh_gestion on adhesions;
create policy adh_gestion on adhesions for update using (org_id = mon_org_id()) with check (org_id = mon_org_id());
drop policy if exists adh_suppression on adhesions;
create policy adh_suppression on adhesions for delete using (org_id = mon_org_id());

-- ---------- 4. Statistiques de visite (comptes par jour, aucune donnée personnelle) ----------
create table if not exists statistiques (
  org_id uuid not null references organisations(id) on delete cascade,
  jour date not null default current_date,
  type text not null check (type in ('vue','whatsapp','partage','don','inscription','adhesion','installation','ecoute','image')),
  source text not null default 'direct' check (char_length(source) <= 20),
  n int not null default 0,
  primary key (org_id, jour, type, source)
);
alter table statistiques enable row level security;
drop policy if exists stats_lecture on statistiques;
create policy stats_lecture on statistiques for select using (org_id = mon_org_id() or est_developpeur());

create or replace function minva_compter(p_org uuid, p_type text, p_source text default 'direct')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_org is null or not org_active(p_org) then return; end if;
  if p_type not in ('vue','whatsapp','partage','don','inscription','adhesion','installation','ecoute','image') then return; end if;
  insert into statistiques (org_id, jour, type, source, n)
  values (p_org, current_date, p_type, left(coalesce(nullif(p_source, ''), 'direct'), 20), 1)
  on conflict (org_id, jour, type, source) do update set n = statistiques.n + 1;
end $$;

grant select on dons_publics, evenements_publics to anon, authenticated;
grant execute on function minva_compter(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
