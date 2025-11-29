import { PermissionType, PermissionDecision } from '../types.js';

export class PermissionManager {
  private sessionStorage: Map<PermissionType, PermissionDecision> = new Map();

  async requestPermission(
    type: PermissionType,
    reason: string
  ): Promise<boolean> {
    // Check if permission was already granted in this session
    const sessionDecision = this.sessionStorage.get(type);
    if (sessionDecision === 'allow-once' || sessionDecision === 'always-allow') {
      return true;
    }
    if (sessionDecision === 'deny') {
      return false;
    }

    // Check if permission was stored in cookie (always allow)
    const cookieDecision = this.getCookiePermission(type);
    if (cookieDecision === 'always-allow') {
      this.sessionStorage.set(type, 'always-allow');
      return true;
    }

    // Request permission from user
    const decision = await this.showPermissionDialog(type, reason);
    
    if (decision === 'deny') {
      this.sessionStorage.set(type, 'deny');
      return false;
    }

    if (decision === 'allow-once') {
      this.sessionStorage.set(type, 'allow-once');
      return true;
    }

    if (decision === 'always-allow') {
      this.sessionStorage.set(type, 'always-allow');
      this.setCookiePermission(type, 'always-allow');
      return true;
    }

    return false;
  }

  private async showPermissionDialog(
    type: PermissionType,
    reason: string
  ): Promise<PermissionDecision> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      
      const modal = document.createElement('div');
      modal.className = 'modal';
      
      const title = document.createElement('div');
      title.className = 'modal-title';
      title.textContent = `Permission Request: ${type}`;
      
      const content = document.createElement('div');
      content.className = 'modal-content';
      content.textContent = reason || `This application wants to access your ${type}.`;
      
      const buttons = document.createElement('div');
      buttons.className = 'modal-buttons';
      
      const denyButton = document.createElement('button');
      denyButton.className = 'modal-button secondary';
      denyButton.textContent = 'Deny';
      denyButton.onclick = () => {
        document.body.removeChild(overlay);
        resolve('deny');
      };
      
      const allowOnceButton = document.createElement('button');
      allowOnceButton.className = 'modal-button secondary';
      allowOnceButton.textContent = 'Allow Once';
      allowOnceButton.onclick = () => {
        document.body.removeChild(overlay);
        resolve('allow-once');
      };
      
      const alwaysAllowButton = document.createElement('button');
      alwaysAllowButton.className = 'modal-button primary';
      alwaysAllowButton.textContent = 'Always Allow';
      alwaysAllowButton.onclick = () => {
        document.body.removeChild(overlay);
        resolve('always-allow');
      };
      
      buttons.appendChild(denyButton);
      buttons.appendChild(allowOnceButton);
      buttons.appendChild(alwaysAllowButton);
      
      modal.appendChild(title);
      modal.appendChild(content);
      modal.appendChild(buttons);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
  }

  private getCookiePermission(type: PermissionType): PermissionDecision | null {
    const cookies = document.cookie.split(';');
    const cookieName = `permission_${type}`;
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === cookieName) {
        return value as PermissionDecision;
      }
    }
    
    return null;
  }

  private setCookiePermission(type: PermissionType, decision: PermissionDecision): void {
    const cookieName = `permission_${type}`;
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1); // 1 year
    document.cookie = `${cookieName}=${decision}; expires=${expires.toUTCString()}; path=/`;
  }

  hasPermission(type: PermissionType): boolean {
    const sessionDecision = this.sessionStorage.get(type);
    if (sessionDecision === 'allow-once' || sessionDecision === 'always-allow') {
      return true;
    }
    
    const cookieDecision = this.getCookiePermission(type);
    return cookieDecision === 'always-allow';
  }
}

