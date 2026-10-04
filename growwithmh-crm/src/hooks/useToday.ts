import { useEffect, useState } from 'react';
import { todayISO } from '@/lib/format';
import { useSettings } from '@/features/settings/api';

/** Today's date (YYYY-MM-DD) in the company timezone; refreshes when the day rolls over. */
export function useToday(): string {
  const { settings } = useSettings();
  const [today, setToday] = useState(() => todayISO(settings.timezone));
  useEffect(() => {
    const tick = () => setToday(todayISO(settings.timezone));
    tick();
    const id = window.setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, [settings.timezone]);
  return today;
}
