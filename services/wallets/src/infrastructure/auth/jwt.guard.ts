import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { verify, JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

const jwksClient = new JwksClient({
  jwksUri: process.env.KEYCLOAK_JWKS_URI ?? "http://keycloak:8080/realms/crash-game/protocol/openid-connect/certs",
  cache: true,
  cacheMaxAge: 600000,
});

function getKey(header: JwtHeader, callback: SigningKeyCallback): void {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err || !key) return callback(err ?? new Error("Key not found"));
    callback(null, key.getPublicKey());
  });
}

@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers["authorization"] as string | undefined;
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException();

    const token = auth.slice(7);
    return new Promise((resolve, reject) => {
      verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
        if (err) return reject(new UnauthorizedException("Invalid token"));
        request.user = decoded;
        resolve(true);
      });
    });
  }
}
