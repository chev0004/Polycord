import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { BannedScreen } from '@/features/Banned/BannedScreen';
import {
  BAN_DATE_HEADER,
  BAN_LOCALE_HEADER,
  BAN_REFERENCE_HEADER,
} from '@/lib/auth-session';

export default async function BannedPage() {
  const requestHeaders = await headers();
  const date = requestHeaders.get(BAN_DATE_HEADER);
  const reference = requestHeaders.get(BAN_REFERENCE_HEADER);

  if (!date || !reference) {
    notFound();
  }

  return (
    <BannedScreen
      locale={requestHeaders.get(BAN_LOCALE_HEADER) ?? 'en'}
      date={new Date(date)}
      reference={reference}
    />
  );
}
