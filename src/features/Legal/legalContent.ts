export type LegalDocumentId = 'terms' | 'privacy' | 'guidelines';

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
};

export type LegalDocumentContent = {
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

export const LEGAL_DOCUMENT_IDS: LegalDocumentId[] = [
  'terms',
  'privacy',
  'guidelines',
];

export const LEGAL_CANONICAL_LOCALE = 'en';

const LAST_UPDATED = '2026-07-02';

const en: Record<LegalDocumentId, LegalDocumentContent> = {
  terms: {
    lastUpdated: LAST_UPDATED,
    intro:
      'These terms explain the deal between you and Polycord when you use the service to discover language partners. By signing in or browsing public profiles you agree to them. We have kept the language plain on purpose, but it is still a binding agreement.',
    sections: [
      {
        heading: 'Who can use Polycord',
        paragraphs: [
          'You must be at least 13 years old, or the minimum digital-consent age in your country if it is higher, to use Polycord. Polycord is built for finding language partners, not for dating or any adult activity.',
          'If you use Polycord on behalf of an organisation, you confirm that you may accept these terms for it.',
        ],
      },
      {
        heading: 'Your account and Discord sign-in',
        paragraphs: [
          'Polycord uses Discord to sign you in. We never see or store your Discord password. You are responsible for keeping your Discord account secure, and for everything that happens under your Polycord account.',
          'You can disconnect at any time by deleting your Polycord account from Settings, which removes your profile from discovery.',
        ],
      },
      {
        heading: 'Your profile and content',
        paragraphs: [
          'You own what you write in your profile. By making a profile public you give us permission to display it to other people in discovery and on shareable public profile links.',
          'Keep your profile honest and appropriate. Do not post other people’s private information, illegal content, or anything that breaks the Community Guidelines.',
        ],
      },
      {
        heading: 'Acceptable use',
        paragraphs: ['You agree not to:'],
        list: [
          'post sexual, pornographic, or otherwise NSFW content anywhere on your profile',
          'use discovery for anything other than finding language partners, including dating, hookups, or promotion',
          'solicit, advertise, trade, sell, or buy sexual content or services, or use your profile to arrange any of that',
          'post, link to, or request illegal content or activity of any kind',
          'harass, threaten, or abuse other members',
          'use Polycord to spam, scam, or advertise unrelated services',
          'scrape, copy, or republish member profiles in bulk',
          'attempt to break, overload, or reverse engineer the service',
          'impersonate another person or misrepresent who you are',
        ],
      },
      {
        heading: "Discord's rules apply too",
        paragraphs: [
          "Polycord is built on top of Discord: every profile belongs to a Discord account and every connection happens there. Anything that Discord's Terms of Service or Community Guidelines prohibit is also prohibited on Polycord, and we treat it exactly like a breach of these terms.",
        ],
      },
      {
        heading: 'Premium and payments',
        paragraphs: [
          'Some features are part of Polycord Premium. Prices, renewal dates, and what each plan includes are shown before you subscribe. Subscriptions renew until you cancel, and you keep paid features until the end of the period you already paid for.',
        ],
      },
      {
        heading: 'Changes and availability',
        paragraphs: [
          'Polycord is a product that keeps evolving, so features may change, pause, or be removed. We may update these terms as the service grows; when we make a material change we will update the date at the top of this page.',
        ],
      },
      {
        heading: 'Disclaimers and liability',
        paragraphs: [
          'Polycord helps you find people, but we cannot vet every member, so use your own judgement before sharing personal details or meeting anyone. The service is provided "as is" without warranties, and to the extent the law allows, Polycord is not liable for indirect or incidental damages arising from your use of it.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'Questions about these terms can go to support@polycord.app. This is a draft pending formal legal review and is not yet legal advice.',
        ],
      },
    ],
  },
  privacy: {
    lastUpdated: LAST_UPDATED,
    intro:
      'This policy explains what Polycord collects, why, and the control you have over it. We try to collect as little as we need to run a language-partner discovery service, and we never sell your personal data.',
    sections: [
      {
        heading: 'Information we collect',
        paragraphs: ['We collect three kinds of information:'],
        list: [
          'Discord account data you authorise at sign-in: your Discord ID, username, avatar, and email address.',
          'Profile data you choose to add: languages, proficiency, country, timezone, availability, bio, interests, and card styling.',
          'Usage data: anonymised product events such as page views and feature use, plus basic technical logs needed to keep the service running.',
        ],
      },
      {
        heading: 'How we use your information',
        paragraphs: [
          'We use your data to show your profile in discovery, to power features such as saved profiles and availability overlap, to keep the service secure, and to understand which parts of the product help people connect.',
        ],
      },
      {
        heading: 'What is public on your profile',
        paragraphs: [
          'When your profile is set to public, the details you add to it are visible to other members and to anyone with your public profile link. Your email address is never shown publicly. You control visibility from Settings, including whether logged-out visitors can copy your Discord username and whether your timezone and availability are displayed.',
        ],
      },
      {
        heading: 'Analytics',
        paragraphs: [
          'We use privacy-aware product analytics to count events such as sign-ups, profile saves, and searches. These events include non-sensitive metadata like locale, but never the private content of your profile or messages. Where required, analytics can be limited or disabled.',
        ],
      },
      {
        heading: 'How we share information',
        paragraphs: [
          'We share data with the service providers that host and operate Polycord, and with Discord for sign-in. We may disclose information if the law requires it or to protect members’ safety. We do not sell personal data to advertisers.',
        ],
      },
      {
        heading: 'Data retention',
        paragraphs: [
          'We keep your profile and account data for as long as your account exists. When you delete your account, your profile and account rows are removed from Polycord. Limited records tied to safety, moderation, billing, or legal obligations may be kept where those systems require it.',
        ],
      },
      {
        heading: 'Export and deletion',
        paragraphs: [
          'You can download a copy of your account, profile, and privacy settings as JSON from Settings at any time. You can also delete your account from Settings, which removes your profile from discovery and deletes your account data.',
        ],
      },
      {
        heading: 'Security',
        paragraphs: [
          'We use industry-standard measures to protect your data, but no online service is perfectly secure. Please keep your Discord account protected, since it is how you sign in.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'Privacy questions can go to privacy@polycord.app. This is a draft pending formal legal review and is not yet legal advice.',
        ],
      },
    ],
  },
  guidelines: {
    lastUpdated: LAST_UPDATED,
    intro:
      'Polycord works when people feel safe reaching out. These guidelines describe what we expect from everyone here and what happens when someone crosses the line. They apply to your profile and to how you treat other members.',
    sections: [
      {
        heading: 'Be respectful',
        paragraphs: [
          'Treat other learners the way you would want to be treated. People come here from many countries and cultures, at every level of fluency. Be patient with mistakes and welcoming to beginners.',
        ],
      },
      {
        heading: 'Keep it about language learning',
        paragraphs: [
          'Polycord is for finding language partners and study buddies. It is not a dating service, and it is never a place for adult content. Keep your profile and your first messages focused on learning, and respect people who only want a study partner.',
          'Profiles exist to find language partners, full stop. Profiles set up for anything else, whether that is seeking dates, self-promotion, or advertising, trading, selling, or buying explicit material, will be removed even when nothing explicit appears on the profile itself.',
        ],
      },
      {
        heading: 'Respect privacy and consent',
        paragraphs: [
          'Do not share anyone’s personal information without their consent, and do not pressure others to move to private channels, share contact details, or send money. Only share what you are comfortable making public.',
        ],
      },
      {
        heading: 'What is not allowed',
        paragraphs: [
          'The following will get content removed or accounts actioned:',
        ],
        list: [
          'harassment, hate speech, or threats of any kind',
          'sexual or otherwise NSFW content anywhere on a profile',
          'soliciting, advertising, trading, selling, or buying sexual content or services',
          'any sexual content involving minors, or any sexual interest in minors',
          'illegal content or activity of any kind',
          'using discovery for dating, hookups, or anything else that is not language learning',
          'spam, scams, phishing, or unsolicited advertising',
          'sharing private information about others without consent',
          'impersonation or deliberately misleading profiles',
          "anything that Discord's Terms of Service or Community Guidelines prohibit",
        ],
      },
      {
        heading: "Discord's rules apply here",
        paragraphs: [
          "Every Polycord profile is attached to a Discord account, so Discord's Terms of Service and Community Guidelines are the baseline everywhere on Polycord. If something would get you actioned on Discord, it gets you actioned here too, and we may also report it to Discord.",
        ],
      },
      {
        heading: 'Reporting and blocking',
        paragraphs: [
          'If someone makes you uncomfortable, you can block them so they no longer appear for you, and you can report a profile so our team can review it. Reports are confidential. Blocking is immediate and does not notify the other person.',
        ],
      },
      {
        heading: 'How we enforce the rules',
        paragraphs: [
          'Depending on what happened, we may hide a profile, remove content, warn a member, or remove an account. Serious safety issues, especially anything involving the safety of minors, are escalated and may be reported to the relevant authorities.',
        ],
      },
      {
        heading: 'Staying safe',
        paragraphs: [
          'Take normal precautions when talking to people you have just met online. Be cautious about sharing personal details, and trust your instincts. If something feels wrong, stop and report it.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'You can reach the safety team at safety@polycord.app. This is a draft pending formal legal review and is not yet legal advice.',
        ],
      },
    ],
  },
};

const documentsByLocale: Record<
  string,
  Record<LegalDocumentId, LegalDocumentContent>
> = {
  en,
};

export type ResolvedLegalDocument = {
  content: LegalDocumentContent;
  isFallback: boolean;
};

export const getLegalDocument = (
  locale: string,
  id: LegalDocumentId,
): ResolvedLegalDocument => {
  const localized = documentsByLocale[locale]?.[id];

  if (localized) {
    return { content: localized, isFallback: false };
  }

  return {
    content: documentsByLocale[LEGAL_CANONICAL_LOCALE][id],
    isFallback: locale !== LEGAL_CANONICAL_LOCALE,
  };
};
