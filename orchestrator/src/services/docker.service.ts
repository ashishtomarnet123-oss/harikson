import docker from '../lib/docker.js';
import path from 'path';
import net from 'net';

async function findOpenPort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const checkPort = (port: number) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(port));
        server.close();
      });
      server.on('error', () => {
        checkPort(port + 1);
      });
    };
    checkPort(startPort);
  });
}

export class DockerService {
  private static isMockMode = false;
  private static readonly networkName = 'harikson-proxy';
  private static readonly internalNetworkName = 'harikson-internal';
  private static readonly baseImage = 'n8nio/n8n:latest';

  static {
    try {
      docker.ping((err) => {
        if (err) {
          console.warn(
            '⚠️ [Orchestrator Docker] Daemon not reachable. Running in Mock Mode.'
          );
          DockerService.isMockMode = true;
        } else {
          console.log(
            '🐳 [Orchestrator Docker] Connected to Docker daemon successfully.'
          );
        }
      });
    } catch {
      DockerService.isMockMode = true;
    }
  }

  static async createInstance(
    name: string,
    plan: string,
    apps: string[]
  ): Promise<{ containerId: string; domain: string }> {
    const domain = `${name}.neuravolt.cloud`;

    if (this.isMockMode) {
      console.log(
        `[Mock Docker] Spawning container for ${name} under plan ${plan} with apps: ${apps.join(', ')}`
      );
      return {
        containerId: `mock_container_${Math.random().toString(36).substring(7)}`,
        domain: domain,
      };
    }

    try {
      let cpuCount = 0.5;
      let memoryLimit = '512m';
      if (plan === 'PRO') {
        cpuCount = 1.0;
        memoryLimit = '1024m';
      } else if (plan === 'BUSINESS' || plan === 'HEAVY') {
        cpuCount = 2.0;
        memoryLimit = '2048m';
      } else if (plan === 'ENTERPRISE') {
        cpuCount = 4.0;
        memoryLimit = '4096m';
      }

      const memoryBytes = parseInt(memoryLimit) * 1024 * 1024;
      await this.ensureNetwork(this.networkName);

      let mainContainerId = '';
      let activeDomain = domain;

      if (apps.includes('n8n')) {
        await this.ensureImage(this.baseImage);
        const containerName = `nv-instance-${name}`;

        const existing = await docker.listContainers({
          all: true,
          filters: { name: [containerName] },
        });
        const existingInfo = existing.find((containerInfo) =>
          containerInfo.Names?.includes(`/${containerName}`)
        );

        let containerId = '';
        if (existingInfo) {
          const existingContainer = docker.getContainer(existingInfo.Id);
          if (existingInfo.State !== 'running') {
            await existingContainer.start();
          }
          containerId = existingInfo.Id;
        } else {
          const container = await docker.createContainer({
            Image: this.baseImage,
            name: containerName,
            Env: [
              `N8N_PORT=5678`,
              `WEBHOOK_URL=https://${domain}/`,
              `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false`,
            ],
            HostConfig: {
              NanoCpus: cpuCount * 1e9,
              Memory: memoryBytes,
              RestartPolicy: { Name: 'unless-stopped' },
              NetworkMode: this.networkName,
              Binds: [`nv-instance-${name}-data:/home/node/.n8n`],
            },
            Labels: {
              'traefik.enable': 'true',
              [`traefik.http.routers.${name}.rule`]: `Host(\`${domain}\`)`,
              [`traefik.http.routers.${name}.entrypoints`]: 'websecure',
              [`traefik.http.routers.${name}.tls.certresolver`]: 'letsencrypt',
              [`traefik.http.services.${name}.loadbalancer.server.port`]:
                '5678',
            },
          });

          await container.start();
          containerId = container.id;
        }
        mainContainerId = containerId;
      }

      if (apps.includes('openwebui')) {
        const apiContainerName = `harikson-tenant-${name}-api`;
        const aiContainerName = `harikson-tenant-${name}-ai`;

        const aiImage = 'ollama/ollama:latest';
        await this.ensureImage(aiImage);

        try {
          const aiContainer = await docker.createContainer({
            Image: aiImage,
            name: aiContainerName,
            HostConfig: {
              NanoCpus: cpuCount * 1e9,
              Memory: memoryBytes,
              RestartPolicy: { Name: 'unless-stopped' },
              NetworkMode: this.networkName,
              Binds: [`harikson-tenant-${name}-ai-data:/root/.ollama`],
            },
          });
          await aiContainer.start();
        } catch (err: any) {
          if (err.statusCode === 409) {
            try {
              await docker.getContainer(aiContainerName).start();
            } catch (err: any) {
              console.warn(`Error starting container ${aiContainerName}:`, err.message);
            }
          } else {
            throw err;
          }
        }

        const apiImage = 'node:18-alpine';
        await this.ensureImage(apiImage);
        const tenantApiPath = path.resolve(process.cwd(), '../harikson/tenant-api');

        try {
          const apiContainer = await docker.createContainer({
            Image: apiImage,
            name: apiContainerName,
            Env: [
              `PORT=5000`,
              `TENANT_NAME=${name}`,
              `AGENT_TYPE=CHAT`,
              `OLLAMA_HOST=http://${aiContainerName}:11434`,
              `NODE_ENV=production`,
            ],
            HostConfig: {
              NanoCpus: cpuCount * 1e9,
              Memory: memoryBytes,
              RestartPolicy: { Name: 'unless-stopped' },
              NetworkMode: this.networkName,
              Binds: [`${tenantApiPath}:/usr/src/app`],
            },
            WorkingDir: '/usr/src/app',
            Cmd: ['npm', 'run', 'start'],
          });
          await apiContainer.start();
          if (!mainContainerId) {
            mainContainerId = apiContainer.id;
          }
        } catch (err: any) {
          if (err.statusCode === 409) {
            try {
              const apiContainer = docker.getContainer(apiContainerName);
              await apiContainer.start();
            } catch (inspectErr) {
              console.warn(
                '⚠️ Failed to start or inspect existing tenant API container:',
                inspectErr
              );
            }
          } else {
            throw err;
          }
        }
      }

      return { containerId: mainContainerId || 'unassigned', domain: activeDomain };
    } catch (error) {
      console.error(`❌ Failed to deploy instance for ${name}:`, error);
      throw error;
    }
  }

  static async stopInstance(name: string): Promise<void> {
    if (this.isMockMode || !name || name.startsWith('mock_')) return;
    try {
      const containerName = `nv-instance-${name}`;
      await docker.getContainer(containerName).stop().catch(() => {});
      await docker.getContainer(`harikson-tenant-${name}-api`).stop().catch(() => {});
      await docker.getContainer(`harikson-tenant-${name}-ai`).stop().catch(() => {});
    } catch (error) {
      console.error(`❌ Failed to stop container for ${name}:`, error);
    }
  }

  static async startInstance(name: string): Promise<void> {
    if (this.isMockMode || !name || name.startsWith('mock_')) return;
    try {
      const containerName = `nv-instance-${name}`;
      await docker.getContainer(containerName).start().catch(() => {});
      await docker.getContainer(`harikson-tenant-${name}-api`).start().catch(() => {});
      await docker.getContainer(`harikson-tenant-${name}-ai`).start().catch(() => {});
    } catch (error) {
      console.error(`❌ Failed to start container for ${name}:`, error);
    }
  }

  static async restartInstance(name: string): Promise<void> {
    if (this.isMockMode || !name || name.startsWith('mock_')) return;
    try {
      const containerName = `nv-instance-${name}`;
      await docker.getContainer(containerName).restart().catch(() => {});
      await docker.getContainer(`harikson-tenant-${name}-api`).restart().catch(() => {});
      await docker.getContainer(`harikson-tenant-${name}-ai`).restart().catch(() => {});
    } catch (error) {
      console.error(`❌ Failed to restart container for ${name}:`, error);
    }
  }

  static async removeInstance(name: string): Promise<void> {
    if (this.isMockMode || !name || name.startsWith('mock_')) return;
    try {
      const containerName = `nv-instance-${name}`;
      await docker.getContainer(containerName).remove({ force: true }).catch(() => {});
      await docker.getContainer(`harikson-tenant-${name}-api`).remove({ force: true }).catch(() => {});
      await docker.getContainer(`harikson-tenant-${name}-ai`).remove({ force: true }).catch(() => {});
      await docker.getVolume(`nv-instance-${name}-data`).remove().catch(() => {});
      await docker.getVolume(`harikson-tenant-${name}-ai-data`).remove().catch(() => {});
    } catch (error) {
      console.error(`❌ Failed to remove container for ${name}:`, error);
    }
  }

  static async scaleInstance(
    name: string,
    cpuLimit: number,
    memoryLimit: string
  ): Promise<void> {
    if (this.isMockMode || !name || name.startsWith('mock_')) return;
    try {
      const containerName = `nv-instance-${name}`;
      const container = docker.getContainer(containerName);
      const memoryBytes = parseInt(memoryLimit) * 1024 * 1024;
      await container.update({
        NanoCpus: cpuLimit * 1e9,
        Memory: memoryBytes,
      });
    } catch (error) {
      console.error(`❌ Failed to scale container for ${name}:`, error);
    }
  }

  static async getMetrics(
    name: string
  ): Promise<{ cpuUsage: number; memoryUsage: number; diskUsage: string }> {
    if (this.isMockMode || !name || name.startsWith('mock_')) {
      return {
        cpuUsage: +(Math.random() * 45 + 5).toFixed(2),
        memoryUsage: +(Math.random() * 300 + 150).toFixed(2),
        diskUsage: '2.4 GB',
      };
    }

    try {
      const containerName = `nv-instance-${name}`;
      const container = docker.getContainer(containerName);
      const stats = await container.stats({ stream: false });

      let cpuPercent = 0.0;
      if (stats.cpu_stats && stats.precpu_stats) {
        const cpuDelta =
          stats.cpu_stats.cpu_usage.total_usage -
          stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta =
          stats.cpu_stats.system_cpu_usage -
          stats.precpu_stats.system_cpu_usage;
        const numberCpus = stats.cpu_stats.online_cpus || 1;
        if (systemDelta > 0.0 && cpuDelta > 0.0) {
          cpuPercent = (cpuDelta / systemDelta) * numberCpus * 100.0;
        }
      }

      let memoryMB = 0;
      if (stats.memory_stats) {
        memoryMB = stats.memory_stats.usage / (1024 * 1024);
      }

      return {
        cpuUsage: +cpuPercent.toFixed(2),
        memoryUsage: +memoryMB.toFixed(2),
        diskUsage: '1.2 GB',
      };
    } catch {
      return { cpuUsage: 0, memoryUsage: 0, diskUsage: '0 GB' };
    }
  }

  static async getLogs(name: string): Promise<string> {
    if (this.isMockMode || !name || name.startsWith('mock_')) {
      return `[Mock Logs ${new Date().toISOString()}] Container initialized.\n[Mock Logs] Traefik health check request received: 200 OK.`;
    }
    try {
      const containerName = `nv-instance-${name}`;
      const container = docker.getContainer(containerName);
      const logBuffer = await container.logs({
        stdout: true,
        stderr: true,
        tail: 100,
      });
      return logBuffer.toString('utf-8');
    } catch {
      return 'Logs unavailable.';
    }
  }

  // From harikson backend DockerService
  static async createTenantStack(
    name: string,
    plan: string,
    agentType: string
  ): Promise<{ containerId: string; domain: string }> {
    const domain = `${name}.neuravolt.cloud`;

    if (this.isMockMode) {
      return {
        containerId: `mock_stack_${Math.random().toString(36).substring(7)}`,
        domain,
      };
    }

    try {
      let cpuCount = 0.5;
      let memoryLimit = '512m';
      if (plan === 'PRO') {
        cpuCount = 1.0;
        memoryLimit = '1024m';
      } else if (plan === 'BUSINESS') {
        cpuCount = 2.0;
        memoryLimit = '2048m';
      } else if (plan === 'ENTERPRISE') {
        cpuCount = 4.0;
        memoryLimit = '4096m';
      }

      const memoryBytes = parseInt(memoryLimit) * 1024 * 1024;
      const apiContainerName = `harikson-tenant-${name}-api`;
      const aiContainerName = `harikson-tenant-${name}-ai`;
      const ideContainerName = `harikson-tenant-${name}-ide`;

      await this.ensureNetwork(this.networkName);
      await this.ensureNetwork(this.internalNetworkName);

      const aiImage = 'ollama/ollama:latest';
      await this.ensureImage(aiImage);

      const aiContainer = await docker.createContainer({
        Image: aiImage,
        name: aiContainerName,
        HostConfig: {
          NanoCpus: cpuCount * 1e9,
          Memory: memoryBytes,
          RestartPolicy: { Name: 'unless-stopped' },
          NetworkMode: this.internalNetworkName,
          Binds: [`harikson-tenant-${name}-ai-data:/root/.ollama`],
        },
      });
      await aiContainer.start();

      const ideImage = 'node:18-alpine';
      await this.ensureImage(ideImage);
      const ideContainer = await docker.createContainer({
        Image: ideImage,
        name: ideContainerName,
        Cmd: ['node', '-e', "console.log('IDE Bridge running...')"],
        HostConfig: {
          Memory: memoryBytes / 2,
          RestartPolicy: { Name: 'unless-stopped' },
          NetworkMode: this.internalNetworkName,
        },
      });
      await ideContainer.start();

      const apiImage = 'node:18-alpine';
      await this.ensureImage(apiImage);

      const apiContainer = await docker.createContainer({
        Image: apiImage,
        name: apiContainerName,
        Env: [
          `PORT=5000`,
          `TENANT_NAME=${name}`,
          `AGENT_TYPE=${agentType}`,
          `OLLAMA_HOST=http://${aiContainerName}:11434`,
        ],
        HostConfig: {
          NanoCpus: cpuCount * 1e9,
          Memory: memoryBytes,
          RestartPolicy: { Name: 'unless-stopped' },
          NetworkMode: this.networkName,
        },
        Labels: {
          'traefik.enable': 'true',
          [`traefik.http.routers.tenant-${name}.rule`]: `Host(\`${domain}\`)`,
          [`traefik.http.routers.tenant-${name}.entrypoints`]: 'websecure',
          [`traefik.http.routers.tenant-${name}.tls.certresolver`]:
            'letsencrypt',
          [`traefik.http.services.tenant-${name}.loadbalancer.server.port`]:
            '5000',
        },
      });
      await apiContainer.start();

      return {
        containerId: apiContainer.id,
        domain,
      };
    } catch (error) {
      console.error('❌ Failed to deploy tenant stack:', error);
      throw error;
    }
  }

  static async destroyTenantStack(name: string): Promise<void> {
    if (this.isMockMode) return;
    try {
      const apiContainerName = `harikson-tenant-${name}-api`;
      const aiContainerName = `harikson-tenant-${name}-ai`;
      const ideContainerName = `harikson-tenant-${name}-ide`;

      const containers = [apiContainerName, aiContainerName, ideContainerName];
      for (const cName of containers) {
        try {
          await docker.getContainer(cName).remove({ force: true });
        } catch {}
      }
      try {
        await docker.getVolume(`harikson-tenant-${name}-ai-data`).remove();
      } catch {}
    } catch (error) {
      console.error(`❌ Failed to clean tenant stack for ${name}:`, error);
    }
  }

  static async stopTenantStack(name: string): Promise<void> {
    if (this.isMockMode) return;
    const containers = [
      `harikson-tenant-${name}-api`,
      `harikson-tenant-${name}-ai`,
      `harikson-tenant-${name}-ide`,
    ];
    for (const cName of containers) {
      try {
        await docker.getContainer(cName).stop();
      } catch {}
    }
  }

  static async startTenantStack(name: string): Promise<void> {
    if (this.isMockMode) return;
    const containers = [
      `harikson-tenant-${name}-api`,
      `harikson-tenant-${name}-ai`,
      `harikson-tenant-${name}-ide`,
    ];
    for (const cName of containers) {
      try {
        await docker.getContainer(cName).start();
      } catch {}
    }
  }

  static async restartTenantStack(name: string): Promise<void> {
    if (this.isMockMode) return;
    const containers = [
      `harikson-tenant-${name}-api`,
      `harikson-tenant-${name}-ai`,
      `harikson-tenant-${name}-ide`,
    ];
    for (const cName of containers) {
      try {
        await docker.getContainer(cName).restart();
      } catch {}
    }
  }

  static async getTenantMetrics(
    name: string,
    containerId: string
  ): Promise<{ cpuUsage: number; memoryUsage: number; diskUsage: string }> {
    if (this.isMockMode || !containerId || containerId.startsWith('mock_')) {
      return {
        cpuUsage: +(Math.random() * 25 + 5).toFixed(2),
        memoryUsage: +(Math.random() * 200 + 80).toFixed(2),
        diskUsage: '1.2 GB',
      };
    }

    try {
      const container = docker.getContainer(`harikson-tenant-${name}-api`);
      const stats = await container.stats({ stream: false });

      let cpuPercent = 0.0;
      if (stats.cpu_stats && stats.precpu_stats) {
        const cpuDelta =
          stats.cpu_stats.cpu_usage.total_usage -
          stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta =
          stats.cpu_stats.system_cpu_usage -
          stats.precpu_stats.system_cpu_usage;
        if (systemDelta > 0 && cpuDelta > 0) {
          cpuPercent =
            (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100;
        }
      }

      let memoryMB = 0;
      if (stats.memory_stats) {
        memoryMB = stats.memory_stats.usage / (1024 * 1024);
      }

      return {
        cpuUsage: +cpuPercent.toFixed(2),
        memoryUsage: +memoryMB.toFixed(2),
        diskUsage: '850 MB',
      };
    } catch {
      return { cpuUsage: 0, memoryUsage: 0, diskUsage: '0 GB' };
    }
  }

  private static async ensureImage(image: string): Promise<void> {
    try {
      await docker.getImage(image).inspect();
      return;
    } catch {
      console.log(`🐳 Pulling image ${image}...`);
    }

    const stream = await docker.pull(image);
    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(stream, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private static async ensureNetwork(networkName: string): Promise<void> {
    try {
      await docker.getNetwork(networkName).inspect();
      return;
    } catch {}

    await docker.createNetwork({
      Name: networkName,
      Driver: 'bridge',
    });
  }
}
