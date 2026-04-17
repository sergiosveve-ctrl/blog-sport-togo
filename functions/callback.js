export async function onRequestGet(context) {
  const { env } = context;
  const { searchParams } = new URL(context.request.url);
  const code = searchParams.get("code");

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
  
  // On renvoie le jeton au CMS
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
