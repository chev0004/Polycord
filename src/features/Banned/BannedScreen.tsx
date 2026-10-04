import { MdBlock, MdMailOutline } from 'react-icons/md';
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-background-main px-5 py-12 text-foreground">
      {/* biome-ignore lint/performance/noImgElement: static wordmark served without the image optimizer */}
      <img
        src="/polycord-wordmark.svg"
        alt={copy.wordmarkAlt}
        className="h-[18px] w-auto opacity-90"
      />
      <main
        role="alert"
        aria-labelledby="banned-title"
        className="w-full max-w-[560px] rounded-panel bg-background-dark px-[22px] py-7 sm:p-10"
      >
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-danger/40 bg-danger-surface text-danger">
          <MdBlock size={24} aria-hidden />
        </div>
        <div className="font-semibold text-muted text-xs uppercase tracking-[0.07em]">
          {copy.eyebrow}
        </div>
        <h1
          id="banned-title"
          className="mt-1.5 font-bold text-[26px] text-foreground leading-[1.15] tracking-[-0.01em] sm:text-3xl"
        >
          {copy.title}
        </h1>
        <div className="mt-5 flex flex-col gap-4 text-[15px] text-soft leading-[1.6]">
          <p>{copy.paragraphOne}</p>
          <p>{copy.paragraphTwo}</p>
        </div>
        <dl className="mt-7 grid grid-cols-1 gap-3 rounded-control bg-background-darker px-[18px] py-4 sm:grid-cols-3 sm:gap-4">
          {[
            [copy.reasonLabel, copy.reason],
            [copy.dateLabel, formattedDate],
            [copy.referenceLabel, reference],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted text-xs">{label}</dt>
              <dd className="mt-1 font-semibold text-foreground text-sm tracking-[0.01em]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <section className="mt-8 flex flex-col items-start gap-3 border-line-strong border-t pt-6">
          <h2 className="font-semibold text-lg text-primary">
            {copy.appealTitle}
          </h2>
          <p className="text-sm text-soft leading-[1.6]">{copy.appealBody}</p>
          <a
            href={`mailto:support@polycord.app?subject=${encodeURIComponent(`${copy.appealSubject} ${reference}`)}`}
            className="mt-1 inline-flex h-10 items-center gap-2 rounded-control border border-line-strong px-5 font-semibold text-sm hover:bg-overlay focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            <MdMailOutline size={18} aria-hidden />
            {copy.emailSupport}
          </a>
        </section>
      </main>
    </div>
  );
};
