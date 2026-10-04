import { MdMailOutline } from 'react-icons/md';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';

export const BannedScreen = ({
  locale,
  date,
  reference,
}: {
  locale: string;
  date: Date;
  reference: string;
}) => {
  const copy = locale === 'ja' ? ja.Banned : en.Banned;
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-background-main px-5 py-12 text-foreground max-md:items-stretch max-md:justify-start max-md:gap-0 max-md:px-6 max-md:pt-7 max-md:pb-0">
      {/* biome-ignore lint/performance/noImgElement: static wordmark served without the image optimizer */}
      <img
        src="/polycord-wordmark.svg"
        alt={copy.wordmarkAlt}
        className="h-[18px] w-auto opacity-90 max-md:mb-14 max-md:h-4 max-md:self-start"
      />
      <main
        role="alert"
        aria-labelledby="banned-title"
        className="w-full max-w-[560px] rounded-panel bg-background-dark p-10 max-md:flex max-md:max-w-none max-md:flex-1 max-md:flex-col max-md:rounded-none max-md:bg-transparent max-md:p-0"
      >
        <div className="font-semibold text-muted text-xs uppercase tracking-[0.07em]">
          {copy.eyebrow}
        </div>
        <h1
          id="banned-title"
          className="mt-2 font-bold text-[34px] text-foreground leading-[1.15] tracking-[-0.01em] max-md:text-4xl max-md:leading-[1.1] max-md:tracking-[-0.015em]"
        >
          {copy.title}
        </h1>
        <p className="mt-5 text-[#e5e7eb] text-[15px] leading-[1.6] max-md:mt-4">
          {copy.paragraph}
        </p>
        <dl className="mt-7 grid grid-cols-3 gap-4 rounded-control bg-background-darker px-[18px] py-4 max-md:block max-md:rounded-none max-md:border-[rgba(107,114,128,0.25)] max-md:border-t max-md:bg-transparent max-md:p-0">
          {[
            [copy.reasonLabel, copy.reason],
            [copy.dateLabel, formattedDate],
            [copy.referenceLabel, reference],
          ].map(([label, value]) => (
            <div
              key={label}
              className="max-md:flex max-md:items-baseline max-md:justify-between max-md:border-[rgba(107,114,128,0.25)] max-md:border-b max-md:py-3.5"
            >
              <dt className="text-muted text-xs max-md:text-sm">{label}</dt>
              <dd className="mt-1 font-semibold text-foreground text-sm tracking-[0.01em] max-md:mt-0">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <section className="max-md:-mx-6 mt-8 flex flex-col items-start gap-3 border-line-strong border-t pt-6 max-md:sticky max-md:bottom-0 max-md:mt-auto max-md:gap-2 max-md:border-t-0 max-md:bg-background-main max-md:px-5 max-md:pt-4 max-md:pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <h2 className="font-semibold text-lg text-primary max-md:text-base">
            {copy.appealTitle}
          </h2>
          <p className="text-[#e5e7eb] text-sm leading-[1.6] max-md:mb-2 max-md:leading-normal">
            {copy.appealBody}
          </p>
          <a
            href={`mailto:support@polycord.app?subject=${encodeURIComponent(`${copy.appealSubject} ${reference}`)}`}
            className="mt-1 inline-flex h-10 items-center gap-2 rounded-control border border-line-strong px-5 font-semibold text-sm hover:bg-overlay focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 max-md:mt-0 max-md:h-[50px] max-md:w-full max-md:justify-center max-md:rounded-full max-md:border-0 max-md:bg-primary max-md:text-[15px] max-md:text-on-primary max-md:hover:bg-primary-light"
          >
            <MdMailOutline size={18} aria-hidden className="max-md:size-5" />
            {copy.emailSupport}
          </a>
        </section>
      </main>
    </div>
  );
};
