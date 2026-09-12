export function EventPageLinks({path,cursor,current,parameter="cursor",label,preserve={}}:{path:string;cursor:string|null;current:boolean;parameter?:string;label:string;preserve?:Record<string,string>}) {
  const first=new URLSearchParams(preserve),next=new URLSearchParams(preserve);
  if(cursor)next.set(parameter,cursor);
  return <nav aria-label={label} className="dp-actions">
    {current?<a className="dp-btn dp-btn-secondary" data-control-id="L05_PAGE_FIRST" href={`${path}${first.size?`?${first}`:""}`}>Première page</a>:null}
    {cursor?<a className="dp-btn dp-btn-secondary" data-control-id="L05_PAGE_NEXT" href={`${path}?${next}`}>Page suivante</a>:null}
  </nav>;
}
