import { List } from "@raycast/api"
import { withAccessToken } from "@raycast/utils"
import { SiteStats } from "./components/site-stats"
import { useSelectedSite } from "./components/site-picker"
import { highseat } from "./lib/highseat"

function ViewStats() {
  const { sites, site, setSiteId, isLoading } = useSelectedSite()

  if (!site) return <List isLoading={isLoading} />
  return <SiteStats site={site} sites={sites} onSwitchSite={setSiteId} />
}

export default withAccessToken(highseat)(ViewStats)
