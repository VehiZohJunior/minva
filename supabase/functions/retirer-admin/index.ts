// =====================================================================
// MinVa — Fonction Edge « retirer-admin » (Console Admin du client)
// =====================================================================
// Un administrateur retire un AUTRE administrateur de son organisation
// (jamais lui-même : l'organisation garde toujours au moins un admin).
// Déploiement : nom « retirer-admin ».
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
    const { data: moi } = await appelant.from('profils').select('role, org_id').eq('id', user.id).single();
    if (moi?.role !== 'admin' || !moi.org_id) throw new Error('Réservé aux administrateurs');

    const { profilId } = await req.json();
    if (!profilId || profilId === user.id) throw new Error('Vous ne pouvez pas vous retirer vous-même');

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: cible } = await admin.from('profils').select('org_id').eq('id', profilId).single();
    if (!cible || cible.org_id !== moi.org_id) throw new Error('Cet administrateur ne fait pas partie de votre organisation');
    const { error } = await admin.auth.admin.deleteUser(profilId); // supprime aussi le profil (cascade)
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, erreur: (e as Error).message }, 400);
  }
});
