import jwt from "@elysiajs/jwt"

export const jwtPlugin = jwt({
  name: "jwt",
  secret: Bun.env.JWT_SECRET || "dev-secret-change-in-production",
  exp: "7d",
})
