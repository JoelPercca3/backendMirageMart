import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "../services/auth.service.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("📝 Perfil de Google recibido:", {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          photo: profile.photos?.[0]?.value,
        });

        const user = await findOrCreateGoogleUser(profile);
        console.log("✅ Usuario creado/encontrado:", user);

        return done(null, user);
      } catch (error) {
        console.error("❌ Error en Google Strategy:", error);
        return done(error, null);
      }
    },
  ),
);

export default passport;
