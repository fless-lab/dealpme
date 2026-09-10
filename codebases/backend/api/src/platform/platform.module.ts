import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuditService } from "./audit.service.js";
import { FeatureFlags } from "./feature-flags.js";
import { RolesGuard } from "./auth.js";
import { RateLimitService } from "./rate-limit.service.js";
import { RedisModule } from "./redis.js";

/** Services transverses disponibles dans tous les modules : audit, drapeaux, garde de rôles. */
@Global()
@Module({
  imports: [RedisModule],
  providers: [AuditService, FeatureFlags, RateLimitService, { provide: APP_GUARD, useClass: RolesGuard }],
  exports: [AuditService, FeatureFlags, RateLimitService],
})
export class PlatformModule {}
