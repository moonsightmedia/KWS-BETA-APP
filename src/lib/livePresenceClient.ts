export type LivePresenceMessage = {
  instance_id: string;
  installation_id: string;
  sequence: number;
  active: boolean;
  platform: 'web' | 'android' | 'ios';
  release: string;
  channel: string;
  screen: string;
  boulder_id: string | null;
};
type PresenceContext = { allowed: boolean; foreground: boolean; online: boolean; owner: string | null; screen: string; boulderId: string | null };
type PresenceDependencies = {
  uuid: () => string;
  transport: (message: LivePresenceMessage, owner: string | null) => Promise<void>;
  installationId: string;
  platform: LivePresenceMessage['platform'];
  release: string;
  channel: string;
};

export class LivePresenceClient {
  private readonly instanceId: string;
  private sequence = 0;
  private active = false;
  private owner: string | null = null;

  constructor(private readonly dependencies: PresenceDependencies) {
    this.instanceId = dependencies.uuid();
  }

  update(context: PresenceContext): void {
    const active = context.allowed && context.foreground && context.online;
    if (!active && !this.active) return;
    const message: LivePresenceMessage = {
      instance_id: this.instanceId, installation_id: this.dependencies.installationId,
      sequence: ++this.sequence, active, platform: this.dependencies.platform,
      release: this.dependencies.release, channel: this.dependencies.channel,
      screen: active ? context.screen : 'other', boulder_id: active ? context.boulderId : null,
    };
    const owner = active ? context.owner : this.owner;
    this.active = active;
    this.owner = context.owner;
    void this.dependencies.transport(message, owner).catch(() => undefined);
  }
}
