import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";
import { PasswordService } from "./password.service.js";
import { SessionMiddleware } from "./session.middleware.js";
import { SessionService } from "./session.service.js";

/**
 * Module IDN (V1) : inscription, mot de passe Argon2id, OTP SMS, sessions serveur, consentements séparés,
 * paliers d'abonnement (sans paiement en V1). Processus contractuel : P08.
 * Sous-modules : auth, otp, session, consent, subscription.
 */
@Module({
  controllers: [IdentityController],
  providers: [IdentityService, PasswordService, SessionService],
  exports: [SessionService],
})
export class IdentityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SessionMiddleware).forRoutes("*");
  }
}
