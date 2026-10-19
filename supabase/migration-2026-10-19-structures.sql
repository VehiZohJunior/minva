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
