import { Controller, Get, Query } from "@nestjs/common";
import { SearchDealsQuerySchema, type SearchDealsQuery } from "@dealpme/contracts";
import { validate } from "../../platform/zod.pipe.js";
import { DealService } from "./deal.service.js";

/** Recherche d'opportunités : champs T0 uniquement, compte authentifié requis (garde de session, V1). */
@Controller("opportunities")
export class SearchController {
  constructor(private readonly dealService: DealService) {}

  @Get()
  search(@Query(validate(SearchDealsQuerySchema)) q: SearchDealsQuery) {
    return this.dealService.searchT0(q);
  }
}
