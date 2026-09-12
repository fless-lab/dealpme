import { describe,it,expect } from "vitest";
import { peakReservations } from "../src/modules/events/reservations.js";
import { CreateEventSchema } from "../src/modules/events/event.schemas.js";
const date=(m:number)=>new Date(m*60000);
describe("Réservation de compte partagé",()=>{
  it("permet la sémantique semi-ouverte pour un autre fournisseur",()=>{expect(peakReservations([{startsAt:date(0),endsAt:date(20)},{startsAt:date(20),endsAt:date(40)}],date(0),date(40),false)).toBe(1);});
  it("compte le pic, y compris quand un événement englobe le nouveau",()=>{expect(peakReservations([{startsAt:date(0),endsAt:date(100)},{startsAt:date(10),endsAt:date(30)}],date(20),date(40))).toBe(2);});
  it("compte les frontières communes selon la documentation Remo",()=>{expect(peakReservations([{startsAt:date(0),endsAt:date(20)}],date(20),date(40))).toBe(1);expect(peakReservations([{startsAt:date(0),endsAt:date(20)},{startsAt:date(20),endsAt:date(40)}],date(0),date(40))).toBe(2);});
  it("rejette une date inversée et un branding exécutable",()=>{const input={title:"Rencontre",startsAt:"2026-10-22T12:00:00Z",endsAt:"2026-10-22T10:00:00Z"};expect(CreateEventSchema.safeParse(input).success).toBe(false);expect(CreateEventSchema.safeParse({...input,endsAt:"2026-10-22T13:00:00Z",branding:{label:"Marque",accent:"url(javascript:alert(1))",welcome:"Bienvenue"}}).success).toBe(false);});
});
