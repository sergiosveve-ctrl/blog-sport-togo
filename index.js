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
    // OPEN GRAPH POUR LES ROBOTS (Facebook, Twitter, WhatsApp...)
    // ═══════════════════════════════════════════════════════
    const isBot = /facebookexternalhit|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|Discordbot/i.test(userAgent);
    const articleParam = url.searchParams.get("p");

    if (isBot && articleParam) {
      const baseUrl = "https://blog-sport-togo.footpulse.workers.dev";
      
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/sergiosveve-ctrl/blog-sport-togo/main/blog/${articleParam}`
        );
        const content = await res.text();
        
        // Extraire les métadonnées
        const parts = content.split('---');
        const meta = parts.length > 1 ? parts[1] : "";
        const title = (meta.match(/title:\s*"(.*?)"/) || meta.match(/title:\s*(.+)/) || ["", "FootPulse"])[1].trim();
        const image = (meta.match(/image:\s*"(.*?)"/) || meta.match(/image:\s*(.+)/) || ["", "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=1200&q=80"])[1].trim();
        const description = (meta.match(/description:\s*"(.*?)"/) || meta.match(/description:\s*(.+)/) || ["", "L'actu foot et omnisports en direct sur FootPulse"])[1].trim();

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title} - FootPulse</title>
  
  <!-- Open Graph (Facebook, WhatsApp, Telegram...) -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${baseUrl}/?p=${articleParam}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="FootPulse">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
</head>
<body>
  <script>
    window.location.href = "${baseUrl}/?p=${articleParam}";
  </script>
</body>
</html>`;

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
