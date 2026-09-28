import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { formatAvailability } from '@/constants/availability';
import { countryOptions } from '@/constants/countries';
import {
  formatTimezone,
  getLanguageName,
  getProficiencyTranslationKey,
} from '@/constants/languages';
import { getPublicProfileById, mapProfileToDiscoveryProfile } from '@/db';
import {
  getFreeCardTheme,
  isValidHex,
  representativeColor,
} from '@/features/Discovery/cardTheme';

const MAX_TAGS = 6;
const MAX_TARGET_LANGUAGES = 3;

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const fetchDataUrl = async (url: string) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return undefined;
    const type = response.headers.get('content-type') ?? 'image/png';
    const data = Buffer.from(await response.arrayBuffer()).toString('base64');
    return `data:${type};base64,${data}`;
  } catch {
    return undefined;
  }
};

const flagUrl = (country: string) =>
  `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${[...country]
    .map((letter) => (0x1f1a5 + letter.charCodeAt(0)).toString(16))
    .join('-')}.svg`;

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div
      style={{
        fontSize: 18,
        fontWeight: 700,
        color: '#8b919a',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
      }}
    >
      {label}
    </div>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 26,
        color: '#e6e8eb',
      }}
    >
      {children}
    </div>
  </div>
);

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ lang: string; id: string }> },
) => {
  const { lang, id } = await params;
  const row = await getPublicProfileById(id);

  if (!row) {
    return new Response(null, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const profile = mapProfileToDiscoveryProfile(row);
  const [t, tDiscovery, tProfile] = await Promise.all([
    getTranslations({ locale: lang, namespace: 'PublicProfile' }),
    getTranslations({ locale: lang, namespace: 'Discovery' }),
    getTranslations({ locale: lang, namespace: 'Profile' }),
  ]);
  const theme = profile.cardTheme ?? getFreeCardTheme(0);
  const [avatar, flag] = await Promise.all([
    profile.avatarUrl
      ? fetchDataUrl(
          profile.avatarUrl
            .replace(/\.gif(?=\?|$)/, '.png')
            .replace(/size=\d+/, 'size=256'),
        )
      : undefined,
    profile.country ? fetchDataUrl(flagUrl(profile.country)) : undefined,
  ]);
  const language = (code: string, level?: string) =>
    level
      ? `${getLanguageName(code, lang)} (${tProfile(getProficiencyTranslationKey(level))})`
      : getLanguageName(code, lang);
  const targets = profile.targetLanguages
    .slice(0, MAX_TARGET_LANGUAGES)
    .map(({ language: code, level }) => language(code, level))
    .join(', ');
  const moreTargets = profile.targetLanguages.length - MAX_TARGET_LANGUAGES;
  const availability = formatAvailability(
    profile.availability,
    profile.timezone,
    undefined,
    {
      days: {
        any: tDiscovery('availabilityDayAny'),
        weekdays: tDiscovery('availabilityDayWeekdays'),
        weekends: tDiscovery('availabilityDayWeekends'),
      },
      anyTime: tDiscovery('availabilityAnyTime'),
      to: tDiscovery('availabilityTimeSeparator'),
      viewerSuffix: '',
    },
    '24hr',
    lang,
  );
  const countryName = countryOptions(lang).find(
    ({ value }) => value === profile.country,
  )?.label;
  const moreTags = profile.tags.length - MAX_TAGS;
  const accent = representativeColor(theme);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 36,
        backgroundColor: '#0e0f11',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          borderRadius: 28,
          overflow: 'hidden',
          backgroundColor: '#1b1c1f',
        }}
      >
        <div
          style={{
            width: 16,
            ...(isValidHex(theme.banner)
              ? { backgroundColor: theme.banner }
              : {
                  backgroundImage: theme.banner.replace('115deg', '180deg'),
                }),
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingTop: 36,
            paddingRight: 44,
            paddingBottom: 30,
            paddingLeft: 44,
            gap: 26,
          }}
        >
          <div style={{ display: 'flex', gap: 36 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                gap: 10,
                minWidth: 0,
              }}
            >
              {profile.discordUsername ? (
                <div style={{ fontSize: 24, color: '#aab1bb' }}>
                  {`@${clip(profile.discordUsername, 32)}`}
                </div>
              ) : null}
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1.1,
                }}
              >
                {clip(profile.displayName, 28)}
              </div>
              {profile.about ? (
                <div
                  style={{
                    display: 'block',
                    lineClamp: 2,
                    fontSize: 26,
                    color: '#c9ced4',
                    lineHeight: 1.4,
                  }}
                >
                  {clip(profile.about.replace(/\s+/g, ' '), 150)}
                </div>
              ) : null}
            </div>
            {avatar ? (
              // biome-ignore lint/performance/noImgElement: next/og renders plain img elements
              <img
                src={avatar}
                alt=""
                width={150}
                height={150}
                style={{ borderRadius: 75, border: `5px solid ${accent}` }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  backgroundColor: accent,
                  color: '#ffffff',
                  fontSize: 64,
                  fontWeight: 700,
                }}
              >
                {[...profile.displayName][0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              rowGap: 22,
              columnGap: 48,
            }}
          >
            <Field label={t('ogLanguages')}>
              {`${language(profile.primaryLanguage, profile.primaryLanguageLevel)} → ${targets}${moreTargets > 0 ? ` +${moreTargets}` : ''}`}
            </Field>
            {availability ? (
              <Field label={t('ogAvailability')}>{availability.ownerStr}</Field>
            ) : null}
            {countryName ? (
              <Field label={t('ogLocation')}>
                {flag ? (
                  // biome-ignore lint/performance/noImgElement: next/og renders plain img elements
                  <img src={flag} alt="" width={30} height={30} />
                ) : null}
                {countryName}
              </Field>
            ) : null}
            {profile.timezone ? (
              <Field label={t('ogTimezone')}>
                {`${profile.timezone} · ${formatTimezone(profile.timezone)}`}
              </Field>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 24,
              marginTop: 'auto',
            }}
          >
            <div
              style={{ display: 'flex', flexWrap: 'wrap', flex: 1, gap: 10 }}
            >
              {profile.tags.slice(0, MAX_TAGS).map((tag) => (
                <div
                  key={tag}
                  style={{
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 14,
                    paddingRight: 14,
                    borderRadius: 8,
                    backgroundColor: '#2b2d31',
                    borderWidth: 1,
                    borderColor: '#3a3d42',
                    color: '#dbdee1',
                    fontSize: 22,
                  }}
                >
                  {clip(tag, 24)}
                </div>
              ))}
              {moreTags > 0 ? (
                <div
                  style={{
                    paddingTop: 6,
                    paddingLeft: 4,
                    color: '#8b919a',
                    fontSize: 22,
                  }}
                >
                  {`+${moreTags}`}
                </div>
              ) : null}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 22,
                color: '#8b919a',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: accent,
                }}
              />
              Polycord
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
};
