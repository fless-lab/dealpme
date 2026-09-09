import { Module } from "@nestjs/common";
import { PlatformModule } from "./platform/platform.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { InstitutionModule } from "./modules/institution/institution.module.js";
import { MarketplaceModule } from "./modules/marketplace/marketplace.module.js";
import { SignatureModule } from "./modules/signature/signature.module.js";
import { DataroomModule } from "./modules/dataroom/dataroom.module.js";
import { NegotiationModule } from "./modules/negotiation/negotiation.module.js";
import { LegaltechModule } from "./modules/legaltech/legaltech.module.js";
import { FinanceModule } from "./modules/finance/finance.module.js";
import { SupportModule } from "./modules/support/support.module.js";
import { ReboundModule } from "./modules/rebound/rebound.module.js";
import { EventsModule } from "./modules/events/events.module.js";
import { ExpertsModule } from "./modules/experts/experts.module.js";

/**
 * Monolithe modulaire : un module NestJS par module fonctionnel de la cartographie.
 * Les modules V2 à V5 existent déjà avec leur contrat et leur fiche (docs/modules) ; ils sont vides jusqu'à leur version.
 */
@Module({
  imports: [
    PlatformModule,
    DatabaseModule,
    // V1
    IdentityModule,
    InstitutionModule,
    MarketplaceModule,
    // V2
    SignatureModule,
    DataroomModule,
    // V3
    NegotiationModule,
    LegaltechModule,
    FinanceModule,
    SupportModule,
    // V4
    ReboundModule,
    EventsModule,
    ExpertsModule,
  ],
})
export class AppModule {}
