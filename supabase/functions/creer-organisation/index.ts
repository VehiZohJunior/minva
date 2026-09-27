// =====================================================================
// MinVa — Fonction Edge « creer-organisation » (Console Développeur)
// =====================================================================
// Crée d'un seul coup : l'organisation cliente + le compte de son premier
// administrateur. Seul le développeur peut l'appeler.
// Déploiement : Supabase → Edge Functions → Deploy a new function →
// nom « creer-organisation » → coller ce code → Deploy.
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Non authentifié');
    const url = Deno.env.get('SUPABASE_URL')!;
    const appelant = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await appelant.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data: profil } = await appelant.from('profils').select('role').eq('id', user.id).single();
    if (profil?.role !== 'developpeur') throw new Error('Réservé au développeur');

    const b = await req.json();
    const slug = String(b.slug || '').toLowerCase().trim();
    if (!b.nom || !slug || !b.admin?.nom || !b.admin?.email || !b.admin?.motDePasse) throw new Error('Champs manquants');
    if (String(b.admin.motDePasse).length < 8) throw new Error('Mot de passe : 8 caractères minimum');

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: org, error: e1 } = await admin.from('organisations').insert({
      nom: b.nom, slug, sigle: b.sigle || '', secteur: b.secteur || 'education',
      ville: b.ville || '', region: b.region || '', plan: b.plan || 'essentiel',
      abonnement_fin: b.abonnementFin || null, theme: b.theme || 'nuit',
    }).select().single();
    if (e1) throw new Error(e1.message.includes('duplicate') ? 'Cette adresse de site est déjà prise' : e1.message);

    const { data: cree, error: e2 } = await admin.auth.admin.createUser({
      email: b.admin.email, password: b.admin.motDePasse, email_confirm: true,
    });
    if (e2) { await admin.from('organisations').delete().eq('id', org.id); throw e2; }

    const { error: e3 } = await admin.from('profils').insert({
      id: cree.user.id, org_id: org.id, role: 'admin', nom: b.admin.nom, email: b.admin.email,
    });
    if (e3) {
      await admin.auth.admin.deleteUser(cree.user.id);
      await admin.from('organisations').delete().eq('id', org.id);
      throw e3;
    }
    return json({ ok: true, organisation: org });
  } catch (e) {
    return json({ ok: false, erreur: (e as Error).message }, 400);
  }
});
