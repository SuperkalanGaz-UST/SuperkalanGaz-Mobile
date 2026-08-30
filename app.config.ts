import type { ConfigContext, ExpoConfig } from 'expo/config';

const INVITATION_PATH = '/delivery-rider-invitation';

function appLinkHost(): string | null {
  const raw = process.env.APP_LINK_HOST?.trim();
  if (!raw) return null;

  if (!/^[a-z0-9.-]+$/i.test(raw) || raw.startsWith('.') || raw.endsWith('.')) {
    throw new Error('APP_LINK_HOST must be a hostname without a path.');
  }

  return raw.toLowerCase();
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const host = appLinkHost();
  if (!host) return config as ExpoConfig;

  const associatedDomain = `applinks:${host}`;
  const associatedDomains = Array.from(
    new Set([...(config.ios?.associatedDomains ?? []), associatedDomain]),
  );
  const invitationIntentFilter = {
    action: 'VIEW',
    autoVerify: true,
    data: {
      scheme: 'https',
      host,
      pathPrefix: INVITATION_PATH,
    },
    category: ['BROWSABLE', 'DEFAULT'],
  };

  return {
    ...config,
    ios: {
      ...config.ios,
      associatedDomains,
    },
    android: {
      ...config.android,
      intentFilters: [
        ...(config.android?.intentFilters ?? []),
        invitationIntentFilter,
      ],
    },
  } as ExpoConfig;
};
