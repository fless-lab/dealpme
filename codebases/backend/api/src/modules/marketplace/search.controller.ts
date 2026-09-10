import { Controller, Get, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { SearchDealsQuerySchema, type SearchDealsQuery } from "@dealpme/contracts";
import type { Principal } from "../../platform/auth.js";
import { validate } from "../../platform/zod.pipe.js";
import { DealService } from "./deal.service.js";

/** Recherche d'opportunités : champs T0 uniquement. Visiteur ou connecté, la projection est la même ; la RLS ne montre que le publié. */
@Controller("opportunities")
export class SearchController {
  constructor(private readonly dealService: DealService) {}

  @Get()
  search(@Query(validate(SearchDealsQuerySchema)) q: SearchDealsQuery, @Req() req: Request & { principal?: Principal }) {
    return this.dealService.searchT0(q, req.principal ?? null);
  }
}
