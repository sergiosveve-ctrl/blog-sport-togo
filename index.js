export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Route pour la connexion (Auth)
    if (url.pathname === "/auth") {
      return Response.redirect(
        `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=repo,user`
      );
    }

    // 2. Route pour le retour GitHub (Callback)
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const result = await response.json();
      return new Response(
        `<html><body><script>
          (function() {
            function receiveMessage(e) {
              window.opener.postMessage('authorization:github:success:${JSON.stringify(result)}', e.origin);
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
          })()
        </script></body></html>`,
        { headers: { "content-type": "text/html" } }
      );
    }

    // 3. Affiche le site statique pour tout le reste
    return env.ASSETS.fetch(request);
  },
};
