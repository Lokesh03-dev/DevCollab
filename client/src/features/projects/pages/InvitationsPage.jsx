import { useEffect, useState } from 'react';
import { Check, Inbox, X } from 'lucide-react';
import Button from '../../../components/ui/Button.jsx';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { getMyInvitations, respondToInvitation } from '../services/invitationService.js';

function getId(invitation) {
  return invitation.id || invitation._id;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    getMyInvitations().then((result) => {
      if (active) setInvitations(result.data.invitations || []);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load invitations.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [reloadKey]);

  async function respond(invitation, response) {
    const id = getId(invitation);
    setActiveId(id);
    setError('');
    setNotice('');
    try {
      const result = await respondToInvitation(id, response);
      setInvitations((current) => current.filter((item) => getId(item) !== id));
      if (response === 'accepted') {
        setNotice(`You joined ${invitation.project?.name || 'the project'}.`);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to respond to this invitation.');
    } finally {
      setActiveId('');
    }
  }

  return (
    <div className="animate-lift-in space-y-6">
      <section><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Workspace</p><h2 className="font-display mt-1 text-3xl font-semibold text-[#26332d]">Invitations</h2><p className="mt-2 text-sm text-[#748078]">Review project invitations sent to your account.</p></section>
      {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e7c9c1] bg-[#fff7f4] px-4 py-3" role="alert"><p className="text-sm text-[#984b3c]">{import.meta.env.DEV ? error : 'We couldn’t complete that request.'}</p><button className="text-sm font-semibold text-[#984b3c] underline" onClick={() => setReloadKey((key) => key + 1)} type="button">Retry</button></div>}
      {notice && <p className="rounded-lg border border-[#c9dfcf] bg-[#eff7f0] px-4 py-3 text-sm text-[#3c704f]" role="status">{notice}</p>}
      {isLoading ? <div className="max-w-3xl rounded-xl border border-[#e1e7e1] bg-white p-8"><LoadingSpinner label="Loading invitations" /></div> : invitations.length ? <section aria-label="Pending invitations" className="grid max-w-3xl gap-3">{invitations.map((invitation) => <article className="rounded-xl border border-[#e1e7e1] bg-white p-5" key={getId(invitation)}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eaf1eb] text-[#28664c]"><Inbox aria-hidden="true" size={18} /></span><div className="min-w-0"><h3 className="font-display text-base font-semibold text-[#26332d]">{invitation.project?.name || 'Project invitation'}</h3><p className="mt-1 text-sm text-[#68766e]">{invitation.inviter?.name || 'A teammate'} invited you to collaborate.</p><p className="mt-1 text-xs text-[#87928b]">Sent {formatDate(invitation.createdAt)} · {invitation.email}</p></div></div><div className="flex shrink-0 gap-2"><Button disabled={activeId === getId(invitation)} onClick={() => respond(invitation, 'reject')} variant="secondary"><X aria-hidden="true" size={15} />Decline</Button><Button disabled={activeId === getId(invitation)} onClick={() => respond(invitation, 'accept')}><Check aria-hidden="true" size={15} />{activeId === getId(invitation) ? 'Working…' : 'Accept'}</Button></div></div></article>)}</section> : <section className="grid min-h-64 max-w-3xl place-items-center rounded-xl border border-dashed border-[#cfd9d0] bg-white/70 p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#e8f0e8] text-[#28664c]"><Inbox aria-hidden="true" size={20} /></span><h3 className="font-display mt-4 text-lg font-semibold text-[#34413b]">No pending invitations</h3><p className="mt-1 text-sm text-[#7d8981]">Project invitations sent to your account will appear here.</p></div></section>}
    </div>
  );
}
