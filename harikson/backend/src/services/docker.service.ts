import docker from "../lib/docker.js";

export class DockerService {
  private static isMockMode = false;
  private static readonly networkName = "harikson-proxy";
  private static readonly internalNetworkName = "harikson-internal";

  static {
    try {
      docker.ping((err) => {
        if (err) {
          console.warn("⚠️ [Harikson Docker] Daemon not reachable. Running in Mock Mode.");
          DockerService.isMockMode = true;
        } else {
          console.log("🐳 [Harikson Docker] Connected to Docker daemon successfully.");
        }
      });
    } catch {
      DockerService.isMockMode = true;
    }
  }

  static async createTenantStack(name: string, plan: string, agentType: string): Promise<{ containerId: string; domain: string }> {
    const domain = `${name}.neuravolt.cloud`;
    
    if (this.isMockMode) {
      console.log(`[Mock Docker] Creating tenant stack for ${name} [Plan: ${plan}, Type: ${agentType}]`);
      return {
        containerId: `mock_stack_${Math.random().toString(36).substring(7)}`,
        domain,
      };
    }

    try {
      // Determine limits based on plan
      let cpuCount = 0.5;
      let memoryLimit = "512m"; // default starter
      
      if (plan === "PRO") {
        cpuCount = 1.0;
        memoryLimit = "1024m";
      } else if (plan === "BUSINESS") {
        cpuCount = 2.0;
        memoryLimit = "2048m";
      } else if (plan === "ENTERPRISE") {
        cpuCount = 4.0;
        memoryLimit = "4096m";
      }

      const memoryBytes = parseInt(memoryLimit) * 1024 * 1024;
      const apiContainerName = `harikson-tenant-${name}-api`;
      const aiContainerName = `harikson-tenant-${name}-ai`;
      const ideContainerName = `harikson-tenant-${name}-ide`;

      // 1. Ensure networks exist
      await this.ensureNetwork(this.networkName);
      await this.ensureNetwork(this.internalNetworkName);

      // 2. Spin up AI Core container (running Ollama / ChromaDB mock)
      const aiImage = "ollama/ollama:latest";
      await this.ensureImage(aiImage);
      
      const aiContainer = await docker.createContainer({
        Image: aiImage,
        name: aiContainerName,
        HostConfig: {
          NanoCpus: cpuCount * 1e9,
          Memory: memoryBytes,
          RestartPolicy: { Name: "unless-stopped" },
          NetworkMode: this.internalNetworkName,
          Binds: [`harikson-tenant-${name}-ai-data:/root/.ollama`],
        },
      });
      await aiContainer.start();

      // 3. Spin up IDE Bridge container (Socket.io)
      const ideImage = "node:18-alpine";
      await this.ensureImage(ideImage);
      const ideContainer = await docker.createContainer({
        Image: ideImage,
        name: ideContainerName,
        Cmd: ["node", "-e", "console.log('IDE Bridge running...')"], // mock start script
        HostConfig: {
          Memory: memoryBytes / 2,
          RestartPolicy: { Name: "unless-stopped" },
          NetworkMode: this.internalNetworkName,
        },
      });
      await ideContainer.start();

      // 4. Spin up Tenant API / Next.js Dashboard container
      const apiImage = "node:18-alpine";
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
          RestartPolicy: { Name: "unless-stopped" },
          NetworkMode: this.networkName,
        },
        Labels: {
          "traefik.enable": "true",
          [`traefik.http.routers.tenant-${name}.rule`]: `Host(\`${domain}\`)`,
          [`traefik.http.routers.tenant-${name}.entrypoints`]: "websecure",
          [`traefik.http.routers.tenant-${name}.tls.certresolver`]: "letsencrypt",
          [`traefik.http.services.tenant-${name}.loadbalancer.server.port`]: "5000",
        },
      });
      await apiContainer.start();

      console.log(`🐳 [Harikson Docker] Created isolated Tenant Stack for ${name} successfully.`);
      return {
        containerId: apiContainer.id, // we map index to the master API container ID
        domain,
      };
    } catch (error) {
      console.error("❌ [Harikson Docker] Failed to deploy tenant stack:", error);
      throw error;
    }
  }

  static async destroyTenantStack(name: string, containerId: string): Promise<void> {
    if (this.isMockMode || containerId.startsWith("mock_")) {
      console.log(`[Mock Docker] Deleting tenant stack for ${name}`);
      return;
    }

    try {
      const apiContainerName = `harikson-tenant-${name}-api`;
      const aiContainerName = `harikson-tenant-${name}-ai`;
      const ideContainerName = `harikson-tenant-${name}-ide`;

      const containers = [apiContainerName, aiContainerName, ideContainerName];
      for (const cName of containers) {
        try {
          const container = docker.getContainer(cName);
          await container.remove({ force: true });
        } catch {
          // ignore if missing
        }
      }

      // Cleanup volume
      try {
        await docker.getVolume(`harikson-tenant-${name}-ai-data`).remove();
      } catch {
        // ignore volume removal failure
      }
      console.log(`🐳 [Harikson Docker] Destroyed tenant stack for ${name}.`);
    } catch (error) {
      console.error(`❌ [Harikson Docker] Failed to clean tenant stack for ${name}:`, error);
    }
  }

  static async stopTenantStack(name: string): Promise<void> {
    if (this.isMockMode) return;
    const containers = [`harikson-tenant-${name}-api`, `harikson-tenant-${name}-ai`, `harikson-tenant-${name}-ide`];
    for (const cName of containers) {
      try {
        await docker.getContainer(cName).stop();
      } catch {}
    }
  }

  static async startTenantStack(name: string): Promise<void> {
    if (this.isMockMode) return;
    const containers = [`harikson-tenant-${name}-api`, `harikson-tenant-${name}-ai`, `harikson-tenant-${name}-ide`];
    for (const cName of containers) {
      try {
        await docker.getContainer(cName).start();
      } catch {}
    }
  }

  static async restartTenantStack(name: string): Promise<void> {
    if (this.isMockMode) return;
    const containers = [`harikson-tenant-${name}-api`, `harikson-tenant-${name}-ai`, `harikson-tenant-${name}-ide`];
    for (const cName of containers) {
      try {
        await docker.getContainer(cName).restart();
      } catch {}
    }
  }

  static async getTenantMetrics(name: string, containerId: string): Promise<{ cpuUsage: number; memoryUsage: number; diskUsage: string }> {
    if (this.isMockMode || !containerId || containerId.startsWith("mock_")) {
      return {
        cpuUsage: +(Math.random() * 25 + 5).toFixed(2),
        memoryUsage: +(Math.random() * 200 + 80).toFixed(2),
        diskUsage: "1.2 GB",
      };
    }

    try {
      const container = docker.getContainer(`harikson-tenant-${name}-api`);
      const stats = await container.stats({ stream: false });
      
      let cpuPercent = 0.0;
      if (stats.cpu_stats && stats.precpu_stats) {
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        if (systemDelta > 0 && cpuDelta > 0) {
          cpuPercent = (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100;
        }
      }

      let memoryMB = 0;
      if (stats.memory_stats) {
        memoryMB = stats.memory_stats.usage / (1024 * 1024);
      }

      return {
        cpuUsage: +cpuPercent.toFixed(2),
        memoryUsage: +memoryMB.toFixed(2),
        diskUsage: "850 MB",
      };
    } catch {
      return { cpuUsage: 0, memoryUsage: 0, diskUsage: "0 GB" };
    }
  }

  private static async ensureImage(image: string): Promise<void> {
    try {
      await docker.getImage(image).inspect();
      return;
    } catch {
      console.log(`🐳 [Harikson Docker] Pulling image ${image}...`);
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
    } catch {
      console.log(`🐳 [Harikson Docker] Creating network ${networkName}...`);
    }

    await docker.createNetwork({
      Name: networkName,
      Driver: "bridge",
    });
  }
}
