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
