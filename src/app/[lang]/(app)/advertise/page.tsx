import { AUDIENCE_MIN_GROUP, getAudienceTotals } from '@/db';
import { AdvertisePage } from '@/features/Advertise';
import { tracePage } from '@/lib/pageLoadTrace';
import { pageTitle } from '@/lib/pageTitle';

export const generateMetadata = pageTitle('advertise', '/advertise');

async function AdvertiseRoute() {
  return (
    <AdvertisePage
      audience={await getAudienceTotals()}
      minGroup={AUDIENCE_MIN_GROUP}
    />
  );
}

export default tracePage('advertise', AdvertiseRoute);
