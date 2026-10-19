-- =====================================================================
-- MinVa · 2026-10-19 · Vague 2 des sites clients
-- Transparence (dépenses), catalogue, matchs, modules (horaires,
-- bénévolat, lieux), sondages et votes, bilan des dons.
-- Ajoute des tables et des colonnes, n'efface rien. Peut être relancé.
-- =====================================================================

-- ---------- 1. Transparence : où va l'argent ----------
create table if not exists depenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  projet_id uuid references projets(id) on delete set null,
  libelle text not null check (char_length(libelle) between 1 and 140),
  montant bigint not null check (montant > 0 and montant <= 10000000000),
  date_depense date not null default current_date,
  justificatif_url text check (justificatif_url is null or char_length(justificatif_url) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists depenses_org_date on depenses (org_id, date_depense desc);
alter table depenses enable row level security;
drop policy if exists dep_lecture on depenses;
create policy dep_lecture on depenses for select using (org_active(org_id) or org_id = mon_org_id() or est_developpeur());
drop policy if exists dep_ecriture on depenses;
create policy dep_ecriture on depenses for all
  using (org_id = mon_org_id() or dev_a_acces(org_id, true)) with check (org_id = mon_org_id() or dev_a_acces(org_id, true));

-- ---------- 2. Catalogue de produits (coopératives, GIE, artisans…) ----------
create table if not exists produits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  prix bigint check (prix is null or prix >= 0),
  unite text not null default '' check (char_length(unite) <= 30),
  photo_url text check (photo_url is null or char_length(photo_url) <= 500),
  disponible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists produits_org on produits (org_id, created_at desc);
alter table produits enable row level security;
drop policy if exists prod_lecture on produits;
create policy prod_lecture on produits for select using (org_active(org_id) or org_id = mon_org_id() or est_developpeur());
drop policy if exists prod_ecriture on produits;
create policy prod_ecriture on produits for all
  using (org_id = mon_org_id() or dev_a_acces(org_id, true)) with check (org_id = mon_org_id() or dev_a_acces(org_id, true));

-- ---------- 3. Matchs et résultats (clubs, ligues, fédérations) ----------
create table if not exists matchs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  competition text not null default '' check (char_length(competition) <= 80),
  adversaire text not null check (char_length(adversaire) between 1 and 80),
  domicile boolean not null default true,
  date_match timestamptz not null,
  lieu text not null default '' check (char_length(lieu) <= 120),
  score_nous int check (score_nous is null or score_nous between 0 and 999),
  score_eux int check (score_eux is null or score_eux between 0 and 999),
  created_at timestamptz not null default now()
);
create index if not exists matchs_org_date on matchs (org_id, date_match desc);
alter table matchs enable row level security;
drop policy if exists match_lecture on matchs;
create policy match_lecture on matchs for select using (org_active(org_id) or org_id = mon_org_id() or est_developpeur());
drop policy if exists match_ecriture on matchs;
create policy match_ecriture on matchs for all
  using (org_id = mon_org_id() or dev_a_acces(org_id, true)) with check (org_id = mon_org_id() or dev_a_acces(org_id, true));

-- ---------- 4. Modules simples rangés avec l'organisation ----------
-- { horaires: [{jour, heure, libelle}], benevolat: [{titre, competence, detail}], lieux: [{nom, type, lat, lng, detail}] }
alter table organisations add column if not exists modules jsonb not null default '{}';
create or replace view organisations_publiques as
  select id, slug, nom, sigle, secteur, ville, region, annee_creation, slogan, mission, apropos,
         zone, langues, beneficiaires, beneficiaires_label, membres, theme, logo_url, couverture_url,
         rubriques, besoins, equipe, contact, dans_annuaire, statut_verification, created_at,
         (select max(a.created_at) from actualites a where a.org_id = o.id) as derniere_actualite,
         type_structure, modules
  from organisations o
  where actif;

-- ---------- 5. Bénévoles : même formulaire que « Devenir membre » ----------
alter table adhesions add column if not exists objet text not null default 'membre' check (objet in ('membre','benevole'));
alter table adhesions add column if not exists competence text not null default '' check (char_length(competence) <= 120);

-- ---------- 6. Sondages et votes ----------
-- code vide : sondage ouvert à tous ; code rempli : vote réservé aux membres qui ont le code
create table if not exists sondages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 200),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  code text not null default '' check (char_length(code) <= 30),
  ouvert boolean not null default true,
  resultats_publics boolean not null default true,
  fin timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sondages_org on sondages (org_id, created_at desc);
alter table sondages enable row level security;
-- La table n'est lisible que par l'organisation (le code de vote reste secret) ; le public passe par la vue
drop policy if exists sond_lecture on sondages;
create policy sond_lecture on sondages for select using (org_id = mon_org_id() or est_developpeur());
drop policy if exists sond_ecriture on sondages;
create policy sond_ecriture on sondages for all
  using (org_id = mon_org_id() or dev_a_acces(org_id, true)) with check (org_id = mon_org_id() or dev_a_acces(org_id, true));

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  sondage_id uuid not null references sondages(id) on delete cascade,
  org_id uuid not null references organisations(id) on delete cascade,
  choix int not null check (choix >= 0),
  votant text not null check (char_length(votant) between 2 and 120),
  created_at timestamptz not null default now(),
  unique (sondage_id, votant)
);
alter table votes enable row level security;
drop policy if exists votes_lecture on votes;
create policy votes_lecture on votes for select using (org_id = mon_org_id() or est_developpeur());
drop policy if exists votes_suppression on votes;
create policy votes_suppression on votes for delete using (org_id = mon_org_id());

-- Voter passe uniquement par cette fonction : elle vérifie tout (ouvert, choix, code, un seul vote)
create or replace function minva_voter(p_sondage uuid, p_choix int, p_votant text, p_code text default '')
returns text language plpgsql security definer set search_path = public as $$
declare s sondages%rowtype; v text;
begin
  select * into s from sondages where id = p_sondage;
  if not found or not s.ouvert or (s.fin is not null and s.fin < now()) or not org_active(s.org_id) then
    raise exception 'Ce vote est fermé.';
  end if;
  if p_choix is null or p_choix < 0 or p_choix >= jsonb_array_length(s.options) then raise exception 'Choix invalide.'; end if;
  if s.code <> '' and lower(trim(coalesce(p_code, ''))) <> lower(trim(s.code)) then raise exception 'Code de vote incorrect.'; end if;
  v := left(lower(trim(coalesce(p_votant, ''))), 120);
  if char_length(v) < 2 then raise exception 'Indiquez votre nom pour voter.'; end if;
  begin
    insert into votes (sondage_id, org_id, choix, votant) values (s.id, s.org_id, p_choix, v);
  exception when unique_violation then
    raise exception 'Vous avez déjà voté.';
  end;
  return 'ok';
end $$;

create or replace view sondages_publics as
  select s.id, s.org_id, s.question, s.options, (s.code <> '') as reserve,
         (s.ouvert and (s.fin is null or s.fin > now())) as ouvert, s.resultats_publics, s.fin, s.created_at,
         (select count(*) from votes v where v.sondage_id = s.id)::int as total,
         case when s.resultats_publics then (
           select jsonb_agg((select count(*) from votes v where v.sondage_id = s.id and v.choix = i) order by i)
           from generate_series(0, jsonb_array_length(s.options) - 1) as i
         ) end as compte
  from sondages s join organisations o on o.id = s.org_id
  where o.actif;

-- ---------- 7. Bilan des dons confirmés (totaux par année, sans aucun nom) ----------
create or replace view dons_bilan as
  select d.org_id, extract(year from d.created_at)::int as annee, sum(d.montant)::bigint as total, count(*)::int as nombre
  from dons d join organisations o on o.id = d.org_id
  where d.statut = 'confirme' and o.actif
  group by d.org_id, extract(year from d.created_at);

grant select on organisations_publiques, sondages_publics, dons_bilan to anon, authenticated;
grant execute on function minva_voter(uuid, int, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
