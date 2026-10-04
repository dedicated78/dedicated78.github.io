import { Link, useNavigate } from 'react-router-dom';
import { FollowUp } from '@/components/FollowUp';
import { StageBadge } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import type { Deal, Lead } from '@/types';

interface Props {
  deals: Deal[];
  leads: Map<string, Lead>;
  currency: string;
  nameOf?: (id: string | null) => string;
  /** show the assignee column (admin) */
  showOwner?: boolean;
}

const contactOf = (d: Deal, l?: Lead) => d.decision_maker || l?.contact_name || l?.phone || '—';

export function DealsTable({ deals, leads, currency, nameOf, showOwner }: Props) {
  const navigate = useNavigate();
  const closed = (d: Deal) => d.stage === 'Won' || d.stage === 'Lost';
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-mute">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-medium">Business</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Contact</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Opportunity</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Stage</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Value</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Next action</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {deals.map((d) => {
              const l = leads.get(d.lead_id);
              return (
                <tr key={d.id} className="cursor-pointer hover:bg-canvas" onClick={() => navigate(`/deals/${d.id}`)}>
                  <td className="max-w-[14rem] px-5 py-3">
                    <Link to={`/deals/${d.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-ink hover:text-brand-700">
                      {l?.business_name ?? 'Deal'}
                    </Link>
                    {showOwner && nameOf && <span className="block truncate text-xs text-mute">{nameOf(d.assigned_to)}</span>}
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-3 text-ink-soft">{contactOf(d, l)}</td>
                  <td className="max-w-[16rem] px-3 py-3 text-ink-soft"><span className="line-clamp-2">{l?.main_opportunity || l?.recommended_service || '—'}</span></td>
                  <td className="px-3 py-3"><StageBadge stage={d.stage} /></td>
                  <td className="px-3 py-3 text-right tabular-nums text-ink">{d.estimated_value > 0 ? formatMoney(d.estimated_value, currency) : <span className="text-mute">—</span>}</td>
                  <td className="max-w-[12rem] truncate px-3 py-3 text-ink-soft">{d.next_action || '—'}</td>
                  <td className="px-5 py-3"><FollowUp date={d.follow_up_date} closed={closed(d)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden">
        {deals.map((d) => {
          const l = leads.get(d.lead_id);
          return (
            <li key={d.id}>
              <Link to={`/deals/${d.id}`} className="block px-4 py-3.5 active:bg-sunken">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{l?.business_name ?? 'Deal'}</p>
                    <p className="truncate text-xs text-mute">{contactOf(d, l)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums text-ink">{d.estimated_value > 0 ? formatMoney(d.estimated_value, currency) : ''}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <StageBadge stage={d.stage} />
                  {d.follow_up_date && <FollowUp date={d.follow_up_date} closed={closed(d)} className="text-xs" />}
                </div>
                {d.next_action && <p className="mt-1.5 truncate text-xs text-ink-soft">Next: {d.next_action}</p>}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
