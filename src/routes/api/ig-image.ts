import { createFileRoute } from "@tanstack/react-router";

// Proxy para imagens do Instagram (lookaside.fbsbx.com e cdninstagram.com)
// Necessário porque o Chrome bloqueia essas URLs por ORB (Opaque Response Blocking).
export const Route = createFileRoute("/api/ig-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url");
        if (!url) return new Response("missing url", { status: 400 });
        // Só permite hosts do IG/FB
        let target: URL;
        try { target = new URL(url); } catch { return new Response("invalid url", { status: 400 }); }
        const host = target.hostname;
        const allowed = /(^|\.)(cdninstagram\.com|fbcdn\.net|fbsbx\.com|instagram\.com)$/i.test(host);
        if (!allowed) return new Response("forbidden host", { status: 403 });
        try {
          const upstream = await fetch(target.toString(), {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
              "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
              "Referer": "https://www.instagram.com/",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (!upstream.ok) return new Response("upstream error", { status: 502 });
          const ct = upstream.headers.get("content-type") ?? "image/jpeg";
          const buf = await upstream.arrayBuffer();
          return new Response(buf, {
            status: 200,
            headers: {
              "Content-Type": ct,
              "Cache-Control": "public, max-age=86400",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch {
          return new Response("timeout", { status: 504 });
        }
      },
    },
  },
});
