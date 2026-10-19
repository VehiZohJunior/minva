-- =====================================================================
-- MinVa — schéma de la base de données (Supabase / Postgres)
-- =====================================================================
-- À exécuter UNE fois, en entier, dans Supabase → SQL Editor → New query
-- → coller tout ce fichier → Run.
--
-- Principe : chaque organisation cliente est cloisonnée. Un administrateur
-- ne voit et ne modifie que SON organisation. Le développeur (console dev)
-- voit la liste des clients pour les gérer, mais n'accède au contenu
-- privé d'un client QUE si ce client a ouvert l'accès développeur
-- (72 h maximum), et ne peut modifier QUE si le client a aussi coché
-- « autoriser les corrections ». Chaque action du développeur est inscrite
-- dans un journal que le client peut lire.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$'),
  nom text not null,
  sigle text default '',
  secteur text not null default 'education'
    check (secteur in ('artisanat','agriculture','environnement','education')),
  ville text default '',
  region text default '',
  annee_creation int,
  slogan text default '',
  mission text default '',
  apropos text default '',
  zone text default '',
  langues text default '',
  beneficiaires int default 0,
  beneficiaires_label text default 'bénéficiaires',
  membres int default 0,
  theme text not null default 'nuit',
  logo_url text,
  couverture_url text,
  rubriques jsonb not null default '{"apropos":true,"actualites":true,"projets":true,"besoins":true,"galerie":true,"documents":true,"equipe":true,"contact":true}',
  besoins jsonb not null default '[]',   -- [{type, titre, detail}]
  equipe jsonb not null default '[]',    -- [{role, nom}]
  contact jsonb not null default '{}',   -- {telephone, whatsapp, email, facebook, adresse}
  dans_annuaire boolean not null default true,
  -- Géré uniquement par MinVa (console développeur) :
  actif boolean not null default true,
  statut_verification text not null default 'en-cours' check (statut_verification in ('en-cours','verifie')),
  plan text not null default 'essentiel',
  abonnement_fin date,
  -- Accès développeur, ouvert par le client lui-même :
  acces_support_actif boolean not null default false,
  acces_support_corrections boolean not null default false,
  acces_support_expire timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists profils (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organisations(id) on delete cascade,
  role text not null check (role in ('admin','developpeur')),
  nom text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  check ((role = 'admin' and org_id is not null) or (role = 'developpeur' and org_id is null))
);

create table if not exists actualites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  type text not null default 'actu' check (type in ('actu','evenement','besoin','rapport')),
  texte text not null default '' check (char_length(texte) <= 2000),
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  auteur_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists actualites_org_date on actualites (org_id, created_at desc);

create table if not exists projets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  titre text not null,
  description text default '',
  collecte bigint not null default 0 check (collecte >= 0),
  objectif bigint not null default 0 check (objectif >= 0),
  donateurs int not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  type text not null check (type in ('statuts','recepisse','bureau','ag','activite','financier')),
  annee int,
  chemin text,                    -- chemin dans le bucket privé "documents"
  statut text not null default 'envoye' check (statut in ('envoye','verifie','refuse')),
  commentaire text default '',
  created_at timestamptz not null default now(),
  unique (org_id, type)
);

create table if not exists journal_support (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  action text not null,
  details text default '',
  created_at timestamptz not null default now()
);

create table if not exists demandes_abonnement (
  id uuid primary key default gen_random_uuid(),
  nom_organisation text not null check (char_length(nom_organisation) <= 200),
  secteur text default '',
  ville text default '',
  responsable text not null check (char_length(responsable) <= 200),
  telephone text not null check (char_length(telephone) <= 40),
  email text default '' check (char_length(email) <= 200),
  plan text default '',
  message text default '' check (char_length(message) <= 2000),
  statut text not null default 'nouvelle' check (statut in ('nouvelle','contactee','convertie','refusee')),
  created_at timestamptz not null default now()
);

create table if not exists erreurs_client (
  id uuid primary key default gen_random_uuid(),
  application text default '',
  message text default '' check (char_length(message) <= 2000),
  page text default '',
  org_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Fonctions d'aide (security definer = lisent profils sans boucle RLS)
-- ---------------------------------------------------------------------

create or replace function est_developpeur() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profils where id = auth.uid() and role = 'developpeur');
$$;

create or replace function mon_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from profils where id = auth.uid() and role = 'admin';
$$;

-- Le développeur a-t-il l'accès (lecture, ou écriture si p_ecriture) à cette organisation ?
create or replace function dev_a_acces(p_org uuid, p_ecriture boolean default false) returns boolean
language sql stable security definer set search_path = public as $$
  select est_developpeur() and exists (
    select 1 from organisations o
    where o.id = p_org
      and o.acces_support_actif
      and o.acces_support_expire > now()
      and (not p_ecriture or o.acces_support_corrections)
  );
$$;

-- L'organisation est-elle en ligne ? (sert à la lecture publique des actualités/projets)
create or replace function org_active(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organisations where id = p_org and actif);
$$;

-- ---------------------------------------------------------------------
-- 3. Règles automatiques (triggers)
-- ---------------------------------------------------------------------

-- 3 administrateurs maximum par organisation
create or replace function limite_trois_admins() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'admin' and (select count(*) from profils where org_id = new.org_id and role = 'admin' and id <> new.id) >= 3 then
    raise exception 'Cette organisation a déjà 3 administrateurs (maximum).';
  end if;
  return new;
end $$;
drop trigger if exists t_limite_trois_admins on profils;
create trigger t_limite_trois_admins before insert or update on profils
  for each row execute function limite_trois_admins();

-- Protège les colonnes gérées par MinVa, et fixe la durée de l'accès développeur
create or replace function protege_organisation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not est_developpeur() then
    new.actif := old.actif;
    new.statut_verification := old.statut_verification;
    new.plan := old.plan;
    new.abonnement_fin := old.abonnement_fin;
    -- Ouverture de l'accès : toujours 72 h à partir de maintenant, jamais plus
    if new.acces_support_actif and (not old.acces_support_actif or new.acces_support_expire is distinct from old.acces_support_expire) then
      new.acces_support_expire := now() + interval '72 hours';
    end if;
    if not new.acces_support_actif then
      new.acces_support_corrections := false;
      new.acces_support_expire := null;
    end if;
  else
    -- Le développeur ne peut jamais s'ouvrir l'accès lui-même
    new.acces_support_actif := old.acces_support_actif;
    new.acces_support_corrections := old.acces_support_corrections;
    new.acces_support_expire := old.acces_support_expire;
  end if;
  return new;
end $$;
drop trigger if exists t_protege_organisation on organisations;
create trigger t_protege_organisation before update on organisations
  for each row execute function protege_organisation();

-- Journal automatique : toute modification faite par le développeur est inscrite
create or replace function journalise_dev() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_quoi text;
begin
  if not est_developpeur() then return coalesce(new, old); end if;
  -- Renouvellement, suspension, badge : gestion d'abonnement, pas une intervention sur le compte
  if tg_table_name = 'organisations' and
     (to_jsonb(new) - array['actif','plan','abonnement_fin','statut_verification']) = (to_jsonb(old) - array['actif','plan','abonnement_fin','statut_verification']) then
    return new;
  end if;
  if tg_table_name = 'organisations' then v_org := coalesce(new.id, old.id);
  else v_org := coalesce(new.org_id, old.org_id); end if;
  v_quoi := case tg_table_name when 'organisations' then 'la fiche de l''organisation'
    when 'actualites' then 'une actualité' when 'projets' then 'un projet' else 'un document' end;
  insert into journal_support (org_id, action, details)
  values (v_org, case tg_op when 'INSERT' then 'ajout' when 'UPDATE' then 'modification' else 'suppression' end,
          'Le développeur a ' || case tg_op when 'INSERT' then 'ajouté ' when 'UPDATE' then 'modifié ' else 'supprimé ' end || v_quoi || '.');
  return coalesce(new, old);
end $$;
drop trigger if exists t_journal_org on organisations;
create trigger t_journal_org after update on organisations for each row execute function journalise_dev();
drop trigger if exists t_journal_actu on actualites;
create trigger t_journal_actu after insert or update or delete on actualites for each row execute function journalise_dev();
drop trigger if exists t_journal_projets on projets;
create trigger t_journal_projets after insert or update or delete on projets for each row execute function journalise_dev();

-- ---------------------------------------------------------------------
-- 4. Vues publiques (seulement les colonnes destinées au grand public)
-- ---------------------------------------------------------------------

create or replace view organisations_publiques as
  select id, slug, nom, sigle, secteur, ville, region, annee_creation, slogan, mission, apropos,
         zone, langues, beneficiaires, beneficiaires_label, membres, theme, logo_url, couverture_url,
         rubriques, besoins, equipe, contact, dans_annuaire, statut_verification, created_at,
         (select max(a.created_at) from actualites a where a.org_id = o.id) as derniere_actualite
  from organisations o
  where actif;

create or replace view documents_publics as
  select d.id, d.org_id, d.type, d.annee, d.statut
  from documents d join organisations o on o.id = d.org_id
  where o.actif;

grant select on organisations_publiques, documents_publics to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Sécurité ligne par ligne (RLS)
-- ---------------------------------------------------------------------

alter table organisations enable row level security;
alter table profils enable row level security;
alter table actualites enable row level security;
alter table projets enable row level security;
alter table documents enable row level security;
alter table journal_support enable row level security;
alter table demandes_abonnement enable row level security;
alter table erreurs_client enable row level security;

-- organisations : l'admin lit/modifie la sienne ; le dev lit la liste (gestion des clients)
-- et ne modifie que si le client a autorisé les corrections. Aucune création ici :
-- seule la fonction Edge "creer-organisation" crée une organisation.
drop policy if exists org_lecture on organisations;
create policy org_lecture on organisations for select using (id = mon_org_id() or est_developpeur());
drop policy if exists org_modif on organisations;
create policy org_modif on organisations for update
  using (id = mon_org_id() or dev_a_acces(id, true))
  with check (id = mon_org_id() or dev_a_acces(id, true));

-- profils : chacun lit le sien ; un admin lit les admins de son organisation ;
-- le dev lit les admins d'un client seulement pendant l'accès support.
drop policy if exists profils_lecture on profils;
create policy profils_lecture on profils for select
  using (id = auth.uid() or (org_id is not null and org_id = mon_org_id()) or (org_id is not null and dev_a_acces(org_id)));

-- actualites / projets : lecture publique si l'organisation est active ;
-- écriture par ses admins, ou par le dev pendant un accès « corrections ».
drop policy if exists actu_lecture on actualites;
create policy actu_lecture on actualites for select
  using (org_active(org_id) or org_id = mon_org_id() or est_developpeur());
drop policy if exists actu_ecriture on actualites;
create policy actu_ecriture on actualites for all
  using (org_id = mon_org_id() or dev_a_acces(org_id, true))
  with check (org_id = mon_org_id() or dev_a_acces(org_id, true));

drop policy if exists projets_lecture on projets;
create policy projets_lecture on projets for select
  using (org_active(org_id) or org_id = mon_org_id() or est_developpeur());
drop policy if exists projets_ecriture on projets;
create policy projets_ecriture on projets for all
  using (org_id = mon_org_id() or dev_a_acces(org_id, true))
  with check (org_id = mon_org_id() or dev_a_acces(org_id, true));

-- documents : l'admin gère les siens ; le dev les lit toujours (c'est le service
-- de vérification de MinVa) et change leur statut via dev_verifier_document().
drop policy if exists docs_lecture on documents;
create policy docs_lecture on documents for select using (org_id = mon_org_id() or est_developpeur());
drop policy if exists docs_ecriture on documents;
create policy docs_ecriture on documents for all
  using (org_id = mon_org_id()) with check (org_id = mon_org_id() and statut = 'envoye');

drop policy if exists journal_lecture on journal_support;
create policy journal_lecture on journal_support for select using (org_id = mon_org_id() or est_developpeur());

-- demandes d'abonnement : tout le monde peut en envoyer une (site vitrine), seul le dev les lit
drop policy if exists demandes_envoi on demandes_abonnement;
create policy demandes_envoi on demandes_abonnement for insert to anon, authenticated with check (statut = 'nouvelle');
drop policy if exists demandes_dev on demandes_abonnement;
create policy demandes_dev on demandes_abonnement for select using (est_developpeur());
drop policy if exists demandes_dev_maj on demandes_abonnement;
create policy demandes_dev_maj on demandes_abonnement for update using (est_developpeur());

drop policy if exists erreurs_envoi on erreurs_client;
create policy erreurs_envoi on erreurs_client for insert to anon, authenticated with check (true);
drop policy if exists erreurs_dev on erreurs_client;
create policy erreurs_dev on erreurs_client for select using (est_developpeur());

-- ---------------------------------------------------------------------
-- 6. Fonctions réservées au développeur (console dev)
-- ---------------------------------------------------------------------

create or replace function dev_liste_organisations()
returns table (id uuid, slug text, nom text, secteur text, ville text, plan text, abonnement_fin date,
  actif boolean, statut_verification text, acces_support_actif boolean, acces_support_corrections boolean,
  acces_support_expire timestamptz, created_at timestamptz, nb_admins bigint, nb_actualites bigint,
  derniere_actualite timestamptz, docs_a_verifier bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not est_developpeur() then raise exception 'Réservé au développeur'; end if;
  return query
    select o.id, o.slug, o.nom, o.secteur, o.ville, o.plan, o.abonnement_fin, o.actif, o.statut_verification,
      o.acces_support_actif and o.acces_support_expire > now(), o.acces_support_corrections, o.acces_support_expire, o.created_at,
      (select count(*) from profils p where p.org_id = o.id),
      (select count(*) from actualites a where a.org_id = o.id),
      (select max(a.created_at) from actualites a where a.org_id = o.id),
      (select count(*) from documents d where d.org_id = o.id and d.statut = 'envoye')
    from organisations o order by o.created_at desc;
end $$;

create or replace function dev_maj_organisation(p_org uuid, p_actif boolean, p_plan text, p_fin date, p_verif text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not est_developpeur() then raise exception 'Réservé au développeur'; end if;
  update organisations set actif = coalesce(p_actif, actif), plan = coalesce(p_plan, plan),
    abonnement_fin = coalesce(p_fin, abonnement_fin), statut_verification = coalesce(p_verif, statut_verification)
  where id = p_org;
end $$;

create or replace function dev_verifier_document(p_doc uuid, p_statut text, p_commentaire text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not est_developpeur() then raise exception 'Réservé au développeur'; end if;
  if p_statut not in ('verifie','refuse') then raise exception 'Statut invalide'; end if;
  update documents set statut = p_statut, commentaire = coalesce(p_commentaire, '') where id = p_doc;
end $$;

create or replace function dev_journaliser_consultation(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not dev_a_acces(p_org) then raise exception 'Accès développeur non autorisé par ce client'; end if;
  insert into journal_support (org_id, action, details)
  values (p_org, 'consultation', 'Le développeur a consulté votre compte pour un dépannage.');
end $$;

-- ---------------------------------------------------------------------
-- 7. Stockage des fichiers
-- ---------------------------------------------------------------------
-- "medias" : public (logos, couvertures, photos des actualités)
-- "documents" : privé (statuts, PV…), lisible par l'organisation et par MinVa
insert into storage.buckets (id, name, public) values ('medias', 'medias', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;

drop policy if exists medias_ecriture on storage.objects;
create policy medias_ecriture on storage.objects for insert to authenticated
  with check (bucket_id = 'medias' and ((storage.foldername(name))[1] = mon_org_id()::text or dev_a_acces(((storage.foldername(name))[1])::uuid, true)));
drop policy if exists medias_suppression on storage.objects;
create policy medias_suppression on storage.objects for delete to authenticated
  using (bucket_id = 'medias' and (storage.foldername(name))[1] = mon_org_id()::text);

drop policy if exists docs_fichiers_lecture on storage.objects;
create policy docs_fichiers_lecture on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = mon_org_id()::text or est_developpeur()));
drop policy if exists docs_fichiers_ecriture on storage.objects;
create policy docs_fichiers_ecriture on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = mon_org_id()::text);
drop policy if exists docs_fichiers_maj on storage.objects;
create policy docs_fichiers_maj on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = mon_org_id()::text);

-- ---------------------------------------------------------------------
-- 8. Votre compte développeur (à faire APRÈS avoir créé l'utilisateur dans
--    Authentication → Users → Add user). Remplacez l'email puis exécutez :
-- ---------------------------------------------------------------------
-- insert into profils (id, role, nom, email)
-- select id, 'developpeur', 'Vehi Zoh Junior', email from auth.users where email = 'VOTRE-EMAIL-DEV@exemple.com';

-- ---------------------------------------------------------------------
-- 9. Ajouté le 2026-10-19 (identique à migration-2026-10-19-structures.sql)
-- ---------------------------------------------------------------------
-- =====================================================================
-- MinVa · 2026-10-19 · Ouverture à toutes les structures
-- Ajoute le « type de structure » (association, coopérative, club,
-- fédération…) et 10 nouveaux secteurs. Rien n'est effacé.
-- Peut être relancé sans risque.
-- =====================================================================

-- 1. Type de structure
alter table organisations add column if not exists type_structure text not null default 'association'
  check (char_length(type_structure) <= 40);
alter table demandes_abonnement add column if not exists type_structure text default ''
  check (char_length(type_structure) <= 40);

-- 2. Secteurs : les 4 d'origine + 10 nouveaux
do $$ declare c text; begin
  for c in select conname from pg_constraint
    where conrelid = 'organisations'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%secteur%'
  loop execute format('alter table organisations drop constraint %I', c); end loop;
end $$;
alter table organisations add constraint organisations_secteur_check check (secteur in (
  'artisanat','agriculture','environnement','education',
  'sante','culture','sport','religion','solidarite','femmes','jeunesse','droits','developpement','professionnel'));

-- 3. Vue publique : le type de structure est visible de tous
create or replace view organisations_publiques as
  select id, slug, nom, sigle, secteur, ville, region, annee_creation, slogan, mission, apropos,
         zone, langues, beneficiaires, beneficiaires_label, membres, theme, logo_url, couverture_url,
         rubriques, besoins, equipe, contact, dans_annuaire, statut_verification, created_at,
         (select max(a.created_at) from actualites a where a.org_id = o.id) as derniere_actualite,
         type_structure
  from organisations o
  where actif;

-- 4. Console développeur : le type dans la liste des clients…
drop function if exists dev_liste_organisations();
create function dev_liste_organisations()
returns table (id uuid, slug text, nom text, secteur text, ville text, plan text, abonnement_fin date,
  actif boolean, statut_verification text, acces_support_actif boolean, acces_support_corrections boolean,
  acces_support_expire timestamptz, created_at timestamptz, nb_admins bigint, nb_actualites bigint,
  derniere_actualite timestamptz, docs_a_verifier bigint, type_structure text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not est_developpeur() then raise exception 'Réservé au développeur'; end if;
  return query
    select o.id, o.slug, o.nom, o.secteur, o.ville, o.plan, o.abonnement_fin, o.actif, o.statut_verification,
      o.acces_support_actif and o.acces_support_expire > now(), o.acces_support_corrections, o.acces_support_expire, o.created_at,
      (select count(*) from profils p where p.org_id = o.id),
      (select count(*) from actualites a where a.org_id = o.id),
      (select max(a.created_at) from actualites a where a.org_id = o.id),
      (select count(*) from documents d where d.org_id = o.id and d.statut = 'envoye'),
      o.type_structure
    from organisations o order by o.created_at desc;
end $$;

-- … et le choix du type à la création ou ensuite
create or replace function dev_maj_type(p_org uuid, p_type text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not est_developpeur() then raise exception 'Réservé au développeur'; end if;
  update organisations set type_structure = coalesce(nullif(p_type, ''), type_structure) where id = p_org;
end $$;

-- 5. Choisir le type d'un client relève de la gestion d'abonnement :
--    ce n'est pas inscrit dans le journal de dépannage du client
create or replace function journalise_dev() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_quoi text;
begin
  if not est_developpeur() then return coalesce(new, old); end if;
  if tg_table_name = 'organisations' and
     (to_jsonb(new) - array['actif','plan','abonnement_fin','statut_verification','type_structure']) = (to_jsonb(old) - array['actif','plan','abonnement_fin','statut_verification','type_structure']) then
    return new;
  end if;
  if tg_table_name = 'organisations' then v_org := coalesce(new.id, old.id);
  else v_org := coalesce(new.org_id, old.org_id); end if;
  v_quoi := case tg_table_name when 'organisations' then 'la fiche de l''organisation'
    when 'actualites' then 'une actualité' when 'projets' then 'un projet' else 'un document' end;
  insert into journal_support (org_id, action, details)
  values (v_org, case tg_op when 'INSERT' then 'ajout' when 'UPDATE' then 'modification' else 'suppression' end,
          'Le développeur a ' || case tg_op when 'INSERT' then 'ajouté ' when 'UPDATE' then 'modifié ' else 'supprimé ' end || v_quoi || '.');
  return coalesce(new, old);
end $$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 10. Ajouté le 2026-10-19 (identique à migration-2026-10-19-vague1.sql)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 11. Ajouté le 2026-10-19 (identique à migration-2026-10-19-vague2.sql)
-- ---------------------------------------------------------------------
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
