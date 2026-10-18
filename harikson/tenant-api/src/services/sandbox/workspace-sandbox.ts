import path from 'path';
import fs from 'fs';

export class WorkspaceSandbox {
  private static BASE_DIR =
    process.env.TENANT_WORKSPACES_ROOT ||
    path.resolve(process.cwd(), 'workspaces');

  /**
   * Resolve and enforce the sandbox directory for a given authenticated tenant.
   * If a client supplies a workspacePath or subpath, it is strictly resolved
   * relative to the tenant's root and cannot escape.
   */
  public static getTenantWorkspace(
    tenantId: string,
    requestedSubpath?: string
  ): string {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Security Exception: Missing tenant identifier.');
    }

    const cleanTenantId = tenantId.trim();
    const isValidId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cleanTenantId
      ) || /^[a-zA-Z0-9_-]{1,64}$/.test(cleanTenantId);

    if (!isValidId) {
      throw new Error('Security Exception: Invalid tenant identifier format.');
    }

    const tenantRoot = path.resolve(this.BASE_DIR, cleanTenantId);
    if (!fs.existsSync(tenantRoot)) {
      fs.mkdirSync(tenantRoot, { recursive: true });
    }

    if (
      !requestedSubpath ||
      requestedSubpath === '.' ||
      requestedSubpath === '/' ||
      requestedSubpath === tenantRoot
    ) {
      return tenantRoot;
    }

    // Treat any client input as relative to the tenantRoot, stripping leading drives or slashes
    const sanitizedSub = path
      .normalize(requestedSubpath)
      .replace(/^([a-zA-Z]:)?[\\/]+/, '')
      .replace(/\0/g, '');

    const resolved = path.resolve(tenantRoot, sanitizedSub);

    if (!this.isWithin(tenantRoot, resolved)) {
      throw new Error(
        'Security Exception: Access Denied. Workspace path escapes tenant sandbox.'
      );
    }

    return resolved;
  }

  /**
   * Safely resolve a target file/folder path inside an authenticated workspace.
   * Prevents directory traversal, absolute path injection, null bytes, and symlink escapes.
   */
  public static resolvePath(
    workspacePath: string,
    targetPath: string
  ): string {
    if (!workspacePath) {
      throw new Error('Security Exception: Missing workspace path.');
    }

    const canonicalWorkspace = path.resolve(workspacePath);
    const cleanTarget = (targetPath || '').replace(/\0/g, '');

    // Reject absolute paths that attempt to reference outside workspace
    if (path.isAbsolute(cleanTarget)) {
      const resolvedAbsolute = path.resolve(cleanTarget);
      if (!this.isWithin(canonicalWorkspace, resolvedAbsolute)) {
        throw new Error(
          'Security Exception: Access Denied. Absolute path escapes workspace sandbox.'
        );
      }
      return resolvedAbsolute;
    }

    const canonicalTarget = path.resolve(canonicalWorkspace, cleanTarget);

    if (!this.isWithin(canonicalWorkspace, canonicalTarget)) {
      throw new Error(
        'Security Exception: Access Denied. Path escapes workspace sandbox.'
      );
    }

    // Symlink escape defense:
    const realWorkspace = fs.existsSync(canonicalWorkspace)
      ? fs.realpathSync(canonicalWorkspace)
      : canonicalWorkspace;

    const targetLstat = fs.lstatSync(canonicalTarget, { throwIfNoEntry: false });
    if (targetLstat) {
      try {
        const realTarget = fs.realpathSync(canonicalTarget);
        if (!this.isWithin(realWorkspace, realTarget)) {
          throw new Error(
            'Security Exception: Access Denied. Symlink escapes workspace sandbox.'
          );
        }
      } catch (err: any) {
        if (err.message?.includes('Security Exception')) throw err;
        if (targetLstat.isSymbolicLink()) {
          throw new Error(
            'Security Exception: Access Denied. Broken symlink escapes workspace sandbox.'
          );
        }
      }
    } else {
      // For non-existent files, verify that all existing parent directories stay inside sandbox
      let currentParent = path.dirname(canonicalTarget);
      while (currentParent && currentParent !== path.dirname(currentParent)) {
        if (fs.existsSync(currentParent)) {
          const realParent = fs.realpathSync(currentParent);
          if (!this.isWithin(realWorkspace, realParent)) {
            throw new Error(
              'Security Exception: Access Denied. Parent directory symlink escapes workspace sandbox.'
            );
          }
          break;
        }
        currentParent = path.dirname(currentParent);
      }
    }

    return canonicalTarget;
  }

  /**
   * Check whether child path is strictly equal to or within parent directory.
   */
  public static isWithin(parent: string, child: string): boolean {
    const relative = path.relative(parent, child);
    return (
      !relative.startsWith('..') &&
      !path.isAbsolute(relative)
    );
  }
}
