import { withAccessToken } from "@raycast/utils"
import { request, highseat } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
}

export default withAccessToken(highseat)(async ({ site }: Input) => {
  return request("get", "/sites/{site}/funnels", { path: { site } })
})
