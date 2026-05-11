export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
    // OPEN GRAPH - POUR TOUTES LES REQUÊTES AVEC ?p=
    // ═══════════════════════════════════════════════════════
    const articleParam = url.searchParams.get("p");

    if (articleParam) {
      const baseUrl = "https://blog-sport-togo.footpulse.workers.dev";
      
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/sergiosveve-ctrl/blog-sport-togo/main/blog/${articleParam}`
        );
        const content = await res.text();
        
        const parts = content.split('---');
        const meta = parts.length > 1 ? parts[1] : "";
        const ogTitle = (meta.match(/title:\s*"(.*?)"/) || meta.match(/title:\s*(.+)/) || ["", "FootPulse"])[1].trim();
        const ogImage = (meta.match(/image:\s*"(.*?)"/) || meta.match(/image:\s*(.+)/) || ["", "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=1200&q=80"])[1].trim();
        const ogDescription = (meta.match(/description:\s*"(.*?)"/) || meta.match(/description:\s*(.+)/) || ["", "L'actu foot et omnisports en direct sur FootPulse"])[1].trim();

        // Récupère le HTML normal
        const asset = await env.ASSETS.fetch(request);
        let html = await asset.text();

        // Injecte les balises OG dans le <head>
        const ogTags = `
  <!-- Open Graph -->
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:url" content="${baseUrl}/?p=${articleParam}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="FootPulse">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${ogImage}">`;

        html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">' + ogTags);

        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      } catch (e) {
        return env.ASSETS.fetch(request);
      }
    }

    // ═══════════════════════════════════════════════════════
    // SITE STATIQUE POUR HUMAINS
    // ═══════════════════════════════════════════════════════
    return env.ASSETS.fetch(request);
  },
};
