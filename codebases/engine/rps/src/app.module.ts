import { Module } from "@nestjs/common";
import { RpsDatabaseModule } from "./database/rps-db.js";
import { GateController } from "./gate/gate.controller.js";
import { GateService } from "./gate/gate.service.js";
import { LedgerService } from "./ledger/ledger.service.js";

@Module({
  imports: [RpsDatabaseModule],
  controllers: [GateController],
  providers: [GateService, LedgerService],
})
export class RpsAppModule {}
