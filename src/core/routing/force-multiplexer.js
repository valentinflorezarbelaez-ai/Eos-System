/**
 * @module ForceMultiplexer
 * @description Maps conceptual workloads to hardware force paths.
 */

export class ForceMultiplexer {
  constructor(routes = []) {
    this.routes = routes;
    this.fallbackRoute = null;
  }

  setFallback(route) {
    this.fallbackRoute = route;
  }

  resolve(workload) {
    if (!workload) return this.fallbackRoute;
    const match = this.routes.find(r => r.canHandle(workload));
    return match || this.fallbackRoute;
  }
}
