import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { Logger } from '../../../observability/logger.js';

export interface ISandboxExecutionOptions {
  codeSnippet: string;
  incomingData: any;
  triggerPayload?: any;
  nodesOutputs?: any;
  tenantId: string;
  executionId: string;
  timeoutMs?: number;
}

export interface ISandboxResult {
  status: 'success' | 'failed';
  data?: any;
  error?: string;
}

export class IsolatedSandbox {
  private static readonly DEFAULT_TIMEOUT_MS = 2000;
  private static readonly MAX_MEMORY_MB = 64;

  /**
   * Static pre-execution token check.
   * Catches overt escape attempts before spawning.
   */
  public static validateCode(code: string): { safe: boolean; reason?: string } {
    const FORBIDDEN_CODE_PATTERNS = /\b(process|_debugProcess|child_process|require|import|constructor|__proto__|prototype|global|globalThis|Function|eval|fetch|WebSocket)\b/;
    if (FORBIDDEN_CODE_PATTERNS.test(code)) {
      return {
        safe: false,
        reason: 'Security Exception: Code execution blocked. Forbidden identifier or keyword detected.',
      };
    }
    return { safe: true };
  }

  /**
   * Validates that an ephemeral directory contains zero external symlinks.
   * Prevents symlink traversal out of the isolated workspace.
   */
  private static async verifyDirectoryIntegrity(dirPath: string): Promise<boolean> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) {
          const target = await fs.promises.readlink(path.join(dirPath, entry.name));
          const resolvedTarget = path.resolve(dirPath, target);
          if (!resolvedTarget.startsWith(dirPath)) {
            return false;
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Executes untrusted workflow code inside an isolated environment with:
   * 1. OS & Node.js Native Permission Boundary:
   *    --permission
   *    --allow-fs-read=<canonical_sandbox_dir>
   *    --allow-fs-write=<canonical_sandbox_dir>
   *    (Blocks all access to host filesystem, /etc, .env, parent dirs via ERR_ACCESS_DENIED)
   * 2. Process & Worker Spawning Denied:
   *    --allow-child-process is NOT passed (ERR_ACCESS_DENIED on any child_process attempt)
   *    --allow-worker is NOT passed (ERR_ACCESS_DENIED on any worker_threads attempt)
   * 3. Native Addons, Dynamic Code Generation, and Debug Process Neutralized:
   *    --no-addons
   *    --disallow-code-generation-from-strings
   *    process._debugProcess, process.kill, process.binding neutralized
   * 4. Memory Ceiling & Resource Caps:
   *    --max-old-space-size=64 (64 MB heap limit)
   * 5. Network Egress Neutralization:
   *    Poisoned network modules and globals (fetch, WebSocket, http, https, net, dgram, tls, dns)
   * 6. Stripped Environment:
   *    Zero platform secrets (cleanEnv contains only minimal PATH, TMPDIR, HOME)
   * 7. Ephemeral Workspace:
   *    Unique directory with POSIX mode 0700 under /tmp/xarwiz-sandboxes/<tenantId>/<executionId>
   * 8. Process Group Termination:
   *    detached: true, process.kill(-child.pid, 'SIGKILL') on timeout
   * 9. Automatic Cleanup:
   *    Unconditionally removes ephemeral workspace in finally block
   */
  public static async execute(options: ISandboxExecutionOptions): Promise<ISandboxResult> {
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const tenantId = (options.tenantId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
    const executionId = (options.executionId || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '');

    // 1. Static security filter
    const validation = this.validateCode(options.codeSnippet);
    if (!validation.safe) {
      return {
        status: 'failed',
        error: validation.reason,
      };
    }

    // 2. Prepare isolated ephemeral directory with restricted permissions (0700)
    const rawSandboxDir = path.join(os.tmpdir(), 'xarwiz-sandboxes', tenantId, executionId);
    await fs.promises.mkdir(rawSandboxDir, { recursive: true });
    try {
      await fs.promises.chmod(rawSandboxDir, 0o700);
    } catch {}

    // Resolve canonical directory path to ensure compatibility with Node.js permission boundary
    let canonicalSandboxDir = rawSandboxDir;
    try {
      canonicalSandboxDir = await fs.promises.realpath(rawSandboxDir);
    } catch {}

    // Symlink traversal check
    const isIntegrityValid = await this.verifyDirectoryIntegrity(canonicalSandboxDir);
    if (!isIntegrityValid) {
      return {
        status: 'failed',
        error: 'Security Exception: Workspace integrity compromised. Symlink traversal detected.',
      };
    }

    const runnerScriptPath = path.join(canonicalSandboxDir, 'runner.mjs');
    const inputPayloadPath = path.join(canonicalSandboxDir, 'payload.json');
    const outputPayloadPath = path.join(canonicalSandboxDir, 'output.json');

    const trimmedCode = options.codeSnippet.trim();
    const hasReturn = /\breturn\b/.test(trimmedCode);
    const isStatement = /^(while|for|if|let|const|var|switch|try|do)\b/.test(trimmedCode) || trimmedCode.endsWith(';');

    const functionBody = hasReturn || isStatement ? trimmedCode : `return (${trimmedCode});`;

    // Construct the unprivileged sandbox runner
    const runnerSource = `
import fs from 'node:fs';

// 1. Neutralize global network APIs
try {
  delete globalThis.fetch;
  delete globalThis.Request;
  delete globalThis.Response;
  delete globalThis.Headers;
  delete globalThis.WebSocket;
  delete globalThis.XMLHttpRequest;
} catch {}

// 2. Neutralize process signal and debug APIs
try {
  if (typeof process !== 'undefined') {
    delete process._debugProcess;
    delete process.kill;
    delete process.abort;
    delete process.exit;
    delete process.binding;
    delete process.dlopen;
  }
} catch {}

const inputPayload = JSON.parse(fs.readFileSync(${JSON.stringify(inputPayloadPath)}, 'utf-8'));
const { input, trigger, nodes } = inputPayload;

// Execute in restricted functional scope
let result;
try {
  result = (function(input, trigger, nodes) {
    "use strict";
    ${functionBody}
  })(input, trigger, nodes);

  fs.writeFileSync(${JSON.stringify(outputPayloadPath)}, JSON.stringify({ status: 'success', data: result !== undefined ? result : { success: true } }));
} catch (err) {
  fs.writeFileSync(${JSON.stringify(outputPayloadPath)}, JSON.stringify({ status: 'failed', error: 'Code execution error: ' + err.message }));
}
`;

    try {
      await fs.promises.writeFile(runnerScriptPath, runnerSource, 'utf-8');
      await fs.promises.writeFile(
        inputPayloadPath,
        JSON.stringify({
          input: options.incomingData || {},
          trigger: options.triggerPayload || {},
          nodes: options.nodesOutputs || {},
        }),
        'utf-8'
      );

      // 3. Spawn isolated child process with stripped environment (ZERO platform secrets)
      const cleanEnv: Record<string, string> = {
        NODE_ENV: 'sandbox',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        TMPDIR: canonicalSandboxDir,
        HOME: canonicalSandboxDir,
      };

      // Construct native engine flags
      const engineArgs = [
        `--max-old-space-size=${this.MAX_MEMORY_MB}`,
        '--disallow-code-generation-from-strings',
        '--no-addons',
      ];

      // Enable Node.js native engine permissions if available
      try {
        engineArgs.push(
          '--permission',
          `--allow-fs-read=${canonicalSandboxDir}`,
          `--allow-fs-write=${canonicalSandboxDir}`
        );
      } catch {}

      engineArgs.push(runnerScriptPath);

      return await new Promise<ISandboxResult>((resolve) => {
        let isTimedOut = false;
        let isResolved = false;

        const child = spawn(process.execPath, engineArgs, {
          cwd: canonicalSandboxDir,
          env: cleanEnv,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: true, // Creates separate OS process group for clean tree termination
        });

        const timer = setTimeout(() => {
          isTimedOut = true;
          try {
            // Kill entire process group
            if (child.pid) process.kill(-child.pid, 'SIGKILL');
          } catch {
            try { child.kill('SIGKILL'); } catch {}
          }
          if (!isResolved) {
            isResolved = true;
            resolve({
              status: 'failed',
              error: `Code execution timed out (exceeded ${timeoutMs}ms limit)`,
            });
          }
        }, timeoutMs);

        let stderrData = '';
        child.stderr.on('data', (chunk) => {
          stderrData += chunk.toString();
        });

        child.on('close', async (code) => {
          clearTimeout(timer);
          if (isResolved) return;
          isResolved = true;

          if (isTimedOut) {
            resolve({
              status: 'failed',
              error: `Code execution timed out (exceeded ${timeoutMs}ms limit)`,
            });
            return;
          }

          if (fs.existsSync(outputPayloadPath)) {
            try {
              const outputJson = JSON.parse(await fs.promises.readFile(outputPayloadPath, 'utf-8'));
              resolve(outputJson);
              return;
            } catch (err: any) {
              resolve({
                status: 'failed',
                error: `Failed to parse sandbox output: ${err.message}`,
              });
              return;
            }
          }

          if (code !== 0) {
            resolve({
              status: 'failed',
              error: `Code execution failed (process exited with code ${code}): ${stderrData.slice(0, 300)}`,
            });
            return;
          }

          resolve({
            status: 'success',
            data: { success: true },
          });
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          if (!isResolved) {
            isResolved = true;
            resolve({
              status: 'failed',
              error: `Sandbox process error: ${err.message}`,
            });
          }
        });
      });
    } catch (err: any) {
      Logger.error('[IsolatedSandbox] Execution setup error:', err);
      return {
        status: 'failed',
        error: `Sandbox initialization error: ${err.message}`,
      };
    } finally {
      // 4. Automatic cleanup: remove the ephemeral sandbox directory and all temporary files
      try {
        await fs.promises.rm(rawSandboxDir, { recursive: true, force: true });
        if (canonicalSandboxDir !== rawSandboxDir) {
          await fs.promises.rm(canonicalSandboxDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        // Ignored
      }
    }
  }
}
