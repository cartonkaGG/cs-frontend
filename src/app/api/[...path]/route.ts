import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Куди проксувати /api/* на сервері Next (локально — зазвичай :4000). */
function backendOrigin(): string {
  const a = process.env.BACKEND_PROXY_URL?.trim();
  const b = process.env.API_INTERNAL_URL?.trim();
  if (a) return a.replace(/\/$/, "");
  if (b) return b.replace(/\/$/, "");
  const pub = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (pub && !isLocalFrontendUrl(pub)) return pub;
  return "http://127.0.0.1:4000";
}

function isLocalFrontendUrl(url: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    return (
      (u.hostname === "localhost" || u.hostname === "127.0.0.1") &&
      (u.port === "3000" || u.port === "")
    );
  } catch {
    return false;
  }
}

const forwardHeaderNames = [
  "authorization",
  "cookie",
  "content-type",
  "accept",
  "accept-language",
  "user-agent",
  "x-requested-with",
];

async function proxy(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const target = `${backendOrigin()}/api/${path}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const name of forwardHeaderNames) {
    const v = req.headers.get(name);
    if (v) headers.set(name, v);
  }
  const method = req.method;
  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    body = await req.arrayBuffer();
  }
  const res = await fetch(target, {
    method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });
  const outHeaders = new Headers(res.headers);
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
}

type RouteCtx = { params: { path: string[] } };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}
