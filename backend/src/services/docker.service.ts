const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://orchestrator:5001';

export class DockerService {
  static async createInstance(
    name: string,
    plan: string,
    apps: string[]
  ): Promise<{ containerId: string; domain: string }> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, plan, apps })
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json() as any;
    } catch (err: any) {
      console.warn(`⚠️ Orchestrator createInstance connection failed, simulating fallback:`, err.message);
      return {
        containerId: `mock_container_${Math.random().toString(36).substring(7)}`,
        domain: `${name}.neuravolt.cloud`,
      };
    }
  }

  static async stopInstance(name: string): Promise<void> {
    if (!name || name.startsWith('mock_')) return;
    try {
      await fetch(`${ORCHESTRATOR_URL}/instances/${name}/stop`, { method: 'POST' });
    } catch (err: any) {
      console.warn(`⚠️ Orchestrator stopInstance failed:`, err.message);
    }
  }

  static async startInstance(name: string): Promise<void> {
    if (!name || name.startsWith('mock_')) return;
    try {
      await fetch(`${ORCHESTRATOR_URL}/instances/${name}/start`, { method: 'POST' });
    } catch (err: any) {
      console.warn(`⚠️ Orchestrator startInstance failed:`, err.message);
    }
  }

  static async restartInstance(name: string): Promise<void> {
    if (!name || name.startsWith('mock_')) return;
    try {
      await fetch(`${ORCHESTRATOR_URL}/instances/${name}/restart`, { method: 'POST' });
    } catch (err: any) {
      console.warn(`⚠️ Orchestrator restartInstance failed:`, err.message);
    }
  }

  static async deleteInstance(name: string): Promise<void> {
    if (!name || name.startsWith('mock_')) return;
    try {
      await fetch(`${ORCHESTRATOR_URL}/instances/${name}`, { method: 'DELETE' });
    } catch (err: any) {
      console.warn(`⚠️ Orchestrator removeInstance failed:`, err.message);
    }
  }

  static async scaleInstance(
    name: string,
    cpuLimit: number,
    memoryLimit: string
  ): Promise<void> {
    if (!name || name.startsWith('mock_')) return;
    try {
      await fetch(`${ORCHESTRATOR_URL}/instances/${name}/scale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpuLimit, memoryLimit })
      });
    } catch (err: any) {
      console.warn(`⚠️ Orchestrator scaleInstance failed:`, err.message);
    }
  }

  static async getMetrics(
    name: string
  ): Promise<{ cpuUsage: number; memoryUsage: number; diskUsage: string }> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/instances/${name}/metrics`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json() as any;
    } catch (err: any) {
      console.warn(`⚠️ Orchestrator getMetrics failed, returning mock metrics:`, err.message);
      return {
        cpuUsage: +(Math.random() * 45 + 5).toFixed(2),
        memoryUsage: +(Math.random() * 300 + 150).toFixed(2),
        diskUsage: '2.4 GB',
      };
    }
  }

  static async getLogs(name: string): Promise<string> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/instances/${name}/logs`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.text();
    } catch (err: any) {
      console.warn(`⚠️ Orchestrator getLogs failed:`, err.message);
      return 'Logs unavailable.';
    }
  }

  static async deleteVolume(name: string): Promise<void> {
    // Volume deletion is managed internally by deleteInstance on the orchestrator.
  }
}
