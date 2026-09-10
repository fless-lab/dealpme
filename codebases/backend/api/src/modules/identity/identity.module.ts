import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { createFakeEmail } from "@dealpme/connector-email";
import { createFakeSms } from "@dealpme/connector-sms";
import { loadEnv } from "../../config/env.js";
import { ApiRateLimitMiddleware } from "../../platform/api-rate-limit.middleware.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";
import { MeController } from "./me.controller.js";
import { SessionController } from "./session.controller.js";
import { EMAIL_PORT, OtpService, SMS_PORT } from "./otp.service.js";
import { PasswordService } from "./password.service.js";
import { SessionMiddleware } from "./session.middleware.js";
import { SessionService } from "./session.service.js";

/**
 * Module IDN (V1) : inscription, mot de passe Argon2id, vérification d'email, OTP SMS et second facteur
 * obligatoire pour les rôles sensibles, sessions serveur, consentements séparés. Processus contractuel : P08.
 * Les connecteurs SMS et email sont choisis par variable d'environnement ; les faux ne sont admis qu'en développement.
 */
@Module({
  controllers: [IdentityController, SessionController, MeController],
  providers: [
    IdentityService,
    PasswordService,
    SessionService,
    OtpService,
    {
      provide: SMS_PORT,
      useFactory: () => {
        const env = loadEnv();
        if (env.CONNECTOR_SMS_PROVIDER !== "fake") throw new Error(`Connecteur SMS "${env.CONNECTOR_SMS_PROVIDER}" non encore intégré`);
        if (env.NODE_ENV === "production") throw new Error("Le faux connecteur SMS est interdit en production");
        return createFakeSms({ echo: env.NODE_ENV === "development" });
      },
    },
    {
      provide: EMAIL_PORT,
      useFactory: () => {
        const env = loadEnv();
        if (env.NODE_ENV === "production" && env.CONNECTOR_EMAIL_PROVIDER === "fake") throw new Error("Le faux connecteur email est interdit en production");
        // Mailpit (SMTP local) arrivera avec l'adaptateur smtp ; en attendant, le faux journalise en développement.
        return createFakeEmail({ echo: env.NODE_ENV === "development" });
      },
    },
  ],
  exports: [SessionService],
})
export class IdentityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ApiRateLimitMiddleware, SessionMiddleware).forRoutes("*");
  }
}
