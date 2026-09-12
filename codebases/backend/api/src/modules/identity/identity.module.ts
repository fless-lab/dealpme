import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { loadEnv } from "../../config/env.js";
import { ApiRateLimitMiddleware } from "../../platform/api-rate-limit.middleware.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";
import { SubscriptionController } from "./subscription.controller.js";
import { MeController } from "./me.controller.js";
import { SessionController } from "./session.controller.js";
import { EMAIL_PORT, OtpService, SMS_PORT } from "./otp.service.js";
import { PasswordService } from "./password.service.js";
import { SessionMiddleware } from "./session.middleware.js";
import { SessionService } from "./session.service.js";
import { emailProvider, smsProvider } from "./notification.providers.js";

/**
 * Module IDN (V1) : inscription, mot de passe Argon2id, vérification d'email, OTP SMS et second facteur
 * obligatoire pour les rôles sensibles, sessions serveur, consentements séparés. Processus contractuel : P08.
 * Les connecteurs SMS et email sont choisis par variable d'environnement ; les faux ne sont admis qu'en développement.
 */
@Module({
  controllers: [IdentityController, SessionController, MeController, SubscriptionController],
  providers: [
    IdentityService,
    PasswordService,
    SessionService,
    OtpService,
    {
      provide: SMS_PORT,
      useFactory: () => smsProvider(loadEnv()),
    },
    {
      provide: EMAIL_PORT,
      useFactory: () => emailProvider(loadEnv()),
    },
  ],
  exports: [SessionService],
})
export class IdentityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ApiRateLimitMiddleware, SessionMiddleware).forRoutes("*");
  }
}
