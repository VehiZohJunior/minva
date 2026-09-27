// =====================================================================
// MinVa — Fonction Edge « inviter-admin » (Console Admin du client)
// =====================================================================
// Un administrateur ajoute un autre administrateur à SON organisation.
// 3 administrateurs maximum (vérifié ici ET par la base de données).
// Déploiement : nom « inviter-admin ».
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

    const { nom, email, motDePasse } = await req.json();
    if (!nom || !email || !motDePasse) throw new Error('Nom, email et mot de passe provisoire requis');
    if (String(motDePasse).length < 8) throw new Error('Mot de passe : 8 caractères minimum');

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { count } = await admin.from('profils').select('id', { count: 'exact', head: true }).eq('org_id', moi.org_id);
    if ((count ?? 0) >= 3) throw new Error('Votre organisation a déjà 3 administrateurs (maximum)');

    const { data: cree, error: e1 } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true });
    if (e1) throw new Error(e1.message.includes('already') ? 'Cet email a déjà un compte MinVa' : e1.message);
    const { error: e2 } = await admin.from('profils').insert({ id: cree.user.id, org_id: moi.org_id, role: 'admin', nom, email });
    if (e2) { await admin.auth.admin.deleteUser(cree.user.id); throw e2; }
    return json({ ok: true, id: cree.user.id });
  } catch (e) {
    return json({ ok: false, erreur: (e as Error).message }, 400);
  }
});
