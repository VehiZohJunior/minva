// =====================================================================
// MinVa — Fonction Edge « supprimer-organisation » (Console Développeur)
// =====================================================================
// Supprime définitivement une organisation : ses données (en cascade),
// ses fichiers, et les comptes de ses administrateurs.
// Déploiement : nom « supprimer-organisation ».
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function viderDossier(admin: ReturnType<typeof createClient>, bucket: string, dossier: string) {
  const { data } = await admin.storage.from(bucket).list(dossier, { limit: 1000 });
  for (const f of data || []) {
    const chemin = `${dossier}/${f.name}`;
    if (f.id === null) await viderDossier(admin, bucket, chemin); // sous-dossier
    else await admin.storage.from(bucket).remove([chemin]);
  }
}

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

    const { orgId } = await req.json();
    if (!orgId) throw new Error('Organisation manquante');
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: admins } = await admin.from('profils').select('id').eq('org_id', orgId);
    await viderDossier(admin, 'medias', orgId);
    await viderDossier(admin, 'documents', orgId);
    const { error } = await admin.from('organisations').delete().eq('id', orgId);
    if (error) throw error;
    for (const a of admins || []) await admin.auth.admin.deleteUser(a.id);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, erreur: (e as Error).message }, 400);
  }
});
