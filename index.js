export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ═══════════════════════════════════════════
    // TEST DIAGNOSTIC - À SUPPRIMER APRÈS
    // ═══════════════════════════════════════════
    const testParam = url.searchParams.get("p");
    if (testParam) {
      return new Response("Param p = " + testParam, { status: 200 });
    }
    // ═══════════════════════════════════════════

    const userAgent = request.headers.get("user-agent") || "";

    // ═══════════════════════════════════════════════════════
    // 0. SITEMAP.XML
    // ═══════════════════════════════════════════════════════
    if (url.pathname === "/sitemap.xml") {
      const baseUrl = "https://blog-sport-togo.footpulse.workers.dev";
      
      try {
        const response = await fetch(
          "https://api.github.com/repos/sergiosveve-ctrl/blog-sport-togo/contents/blog"
        );
        const files = await response.json();
        const mdFiles = Array.isArray(files)
          ? files.filter(f => f.name.endsWith('.md'))
          : [];

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/</loc>\n`;
        xml += '    <changefreq>daily</changefreq>\n';
        xml += '    <priority>1.0</priority>\n';
        xml += '  </url>\n';
        for (const file of mdFiles) {
          xml += '  <url>\n';
          xml += `    <loc>${baseUrl}/?p=${file.name}</loc>\n`;
          xml += '    <changefreq>weekly</changefreq>\n';
          xml += '    <priority>0.8</priority>\n';
          xml += '  </url>\n';
        }
        xml += '</urlset>';

        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8" }
        });
      } catch (e) {
        return new Response("Erreur sitemap", { status: 500 });
      }
    }

    // ═══════════════════════════════════════════════════════
    // AUTH + CALLBACK (inchangé)
    // ═══════════════════════════════════════════════════════
    if (url.pathname === "/auth") {
      return Response.redirect(
        `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=repo,user`
      );
    }

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
      const token = result.access_token;
      return new Response(
        `<html><body><script>
          (function() {
            function receiveMessage(e) {
              window.opener.postMessage(
                'authorization:github:success:{"token":"${token}","provider":"github"}', 
                e.origin
              );
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
          })()
        </script></body></html>`,
        { headers: { "content-type": "text/html" } }
      );
    }

    // ═══════════════════════════════════════════════════════
    // SITE STATIQUE POUR HUMAINS
    // ═══════════════════════════════════════════════════════
    return env.ASSETS.fetch(request);
  },
};
