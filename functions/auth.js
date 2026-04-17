// Ce code permet à Decap CMS de se connecter à GitHub via Cloudflare
export async function onRequestGet(context) {
  const { env } = context;
  const client_id = env.GITHUB_CLIENT_ID;
  
  // On redirige vers GitHub pour demander l'autorisation
  return Response.redirect(
    `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo,user`
  );
}
