function getId(member) {
  return typeof member === 'string' ? member : member.id || member._id;
}

export default function ProjectMemberList({ members, ownerId, canManage = false, onRemove }) {
  return (
    <div className="grid gap-2">
      {members.map((member) => (
        <div className="flex items-center gap-3 rounded-lg border border-[#e5eae5] bg-white px-3 py-2.5" key={getId(member)}>
          <span className="grid size-9 place-items-center rounded-full bg-[#e8eee9] text-xs font-bold text-[#41624d]">{member.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#303d36]">{member.name}</p><p className="truncate text-xs text-[#87928b]">{member.email}</p></div>
          {getId(member) === ownerId && <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64806f]">Owner</span>}
          {canManage && getId(member) !== ownerId && <button aria-label={`Remove ${member.name}`} className="rounded-md px-2 py-1 text-xs font-semibold text-[#a44837] hover:bg-[#fff0ec]" onClick={() => onRemove(member)} type="button">Remove</button>}
        </div>
      ))}
      {members.length === 0 && <p className="rounded-lg border border-dashed border-[#d4ddd5] px-4 py-6 text-center text-sm text-[#87928b]">No members found.</p>}
    </div>
  );
}