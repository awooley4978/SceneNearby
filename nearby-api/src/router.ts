// ── Simple URL Router ──
// Lightweight router for the Bun HTTP server.

export interface RouteMatch {
  handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>;
  params: Record<string, string>;
}

type RouteEntry = {
  method: string;
  pattern: string;
  handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>;
};

export class Router {
  private routes: RouteEntry[] = [];

  get(pattern: string, handler: RouteEntry["handler"]): void {
    this.routes.push({ method: "GET", pattern, handler });
  }

  post(pattern: string, handler: RouteEntry["handler"]): void {
    this.routes.push({ method: "POST", pattern, handler });
  }

  put(pattern: string, handler: RouteEntry["handler"]): void {
    this.routes.push({ method: "PUT", pattern, handler });
  }

  delete(pattern: string, handler: RouteEntry["handler"]): void {
    this.routes.push({ method: "DELETE", pattern, handler });
  }

  match(method: string, pathname: string): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const params = this.matchPath(route.pattern, pathname);
      if (params !== null) {
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  private matchPath(pattern: string, pathname: string): Record<string, string> | null {
    // Convert pattern like /api/gallery/:locationId to regex
    const patternParts = pattern.split("/");
    const pathParts = pathname.split("/");

    if (patternParts.length !== pathParts.length) return null;

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }

    return params;
  }
}