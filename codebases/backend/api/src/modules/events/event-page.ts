import { z } from "zod";

const Cursor = z.tuple([z.iso.datetime(),z.uuid()]);
export const EventPageSchema = z.object({cursor:z.string().max(256).regex(/^[A-Za-z0-9_-]+$/).optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).transform((value,ctx)=>{
  let before:{createdAt:string;id:string}|null=null;
  if(value.cursor) {
    try { const [date,id]=Cursor.parse(JSON.parse(Buffer.from(value.cursor,"base64url").toString("utf8")));before={createdAt:date,id}; }
    catch { ctx.addIssue({code:"custom",path:["cursor"],message:"Curseur de pagination invalide"});return z.NEVER; }
  }
  return {limit:value.limit,before};
});
export type EventPage = z.infer<typeof EventPageSchema>;
export const firstEventPage:EventPage={limit:50,before:null};
export function pageOf<T extends {id:string;cursorTime:string}>(rows:T[],limit:number) {
  const selected=rows.slice(0,limit),last=selected.at(-1);
  // Conserver la précision microseconde de PostgreSQL, pas celle (milliseconde) de Date.
  const items=selected.map(({cursorTime: _cursorTime,...item})=>item);
  return {items,nextCursor:rows.length>limit&&last?Buffer.from(JSON.stringify([last.cursorTime,last.id])).toString("base64url"):null};
}
