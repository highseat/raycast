import { OAuth } from "@raycast/api"
import { OAuthService } from "@raycast/utils"
import { createApi } from "highseat/api"

export const APP_URL = "https://app.highseat.com"

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Highseat",
  providerIcon: "icon.png",
  description: "Connect your Highseat account",
})

export const highseat = new OAuthService({
  client,
  clientId: "https://api.highseat.com/.well-known/oauth-client-metadata/raycast.json",
  scope: "read offline_access",
  authorizeUrl: `${APP_URL}/api/auth/oauth2/authorize`,
  tokenUrl: `${APP_URL}/api/auth/oauth2/token`,
  bodyEncoding: "url-encoded",
})

export const api = createApi({ token: () => highseat.authorize() })

type Method = "get" | "post" | "patch" | "delete"
type Call = (path: string, options: object) => Promise<unknown>

/**
 * A call whose route or body is only known at run time, as an AI tool's is. The API validates every
 * argument, so a wrong one comes back as its own error for the model to read.
 */
export function request(method: Method, path: string, options: object) {
  return (api[method] as unknown as Call)(path, options)
}

/** Whether a person has connected, without starting a sign-in. */
export async function isConnected() {
  return Boolean(await client.getTokens())
}

/** Forgets the connection, so the next call opens the picker again. */
export async function disconnect() {
  await client.removeTokens()
}
