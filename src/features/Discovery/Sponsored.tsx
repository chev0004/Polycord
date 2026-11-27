'use client';

import Image, { getImageProps } from 'next/image';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useRef } from 'react';
import {
  type DiscoveryBanner,
  type DiscoverySponsor,
  SPONSOR_IMAGE_SIZES,
} from '@/constants/sponsors';

const record = (id: string, event: 'view' | 'click') =>
  navigator.sendBeacon(`/api/sponsors/${id}`, event);

const SponsorLink = ({
  sponsor,
  className,
  children,
}: {
  sponsor: DiscoverySponsor;
  className: string;
  children: ReactNode;
}) => {
  const t = useTranslations('Discovery');
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        record(sponsor.id, 'view');
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [sponsor.id]);
  return (
    <a
      ref={ref}
      href={sponsor.url}
      target="_blank"
      rel="sponsored noopener"
      onClick={() => record(sponsor.id, 'click')}
      className={`relative block overflow-hidden ${className}`}
    >
      {children}
      <span className="pointer-events-none absolute top-2.5 right-2.5 rounded-full bg-black/60 px-[11px] py-[5px] font-semibold text-[11px] text-foreground uppercase tracking-wide backdrop-blur-sm">
        {t('sponsored')}
      </span>
    </a>
  );
};

export const SponsoredCard = ({ sponsor }: { sponsor: DiscoverySponsor }) => (
  <div className="mx-auto w-full max-w-[460px]">
    <SponsorLink
      sponsor={sponsor}
      className="hover:-translate-y-1 mb-6 rounded-3xl bg-background-dark shadow-lg transition-transform duration-200 hover:shadow-xl"
    >
      <Image
        src={sponsor.image}
        alt={sponsor.alt}
        {...SPONSOR_IMAGE_SIZES.card}
        sizes="(min-width: 1024px) 377px, 460px"
        className="block aspect-[4/5] h-auto w-full"
      />
    </SponsorLink>
  </div>
);

export const SponsorBanner = ({ sponsor }: { sponsor: DiscoveryBanner }) => {
  const wide = getImageProps({
    src: sponsor.image,
    alt: sponsor.alt,
    ...SPONSOR_IMAGE_SIZES.banner,
    sizes: '(min-width: 1280px) 1216px, 100vw',
    priority: true,
  }).props;
  const phone = getImageProps({
    src: sponsor.phoneImage,
    alt: sponsor.alt,
    ...SPONSOR_IMAGE_SIZES.phone,
    sizes: '100vw',
    priority: true,
  }).props;
  return (
    <SponsorLink sponsor={sponsor} className="rounded-2xl bg-background-dark">
      <picture>
        <source
          media="(min-width: 768px)"
          srcSet={wide.srcSet}
          sizes={wide.sizes}
        />
        <img
          {...phone}
          alt={sponsor.alt}
          className="block aspect-[4/1] h-auto w-full md:aspect-[8/1]"
        />
      </picture>
    </SponsorLink>
  );
};
