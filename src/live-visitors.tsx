import { Cache, environment, Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api"
import { useCachedPromise, useCachedState } from "@raycast/utils"
import { Site } from "./components/site-picker"
import { formatCount } from "./lib/format"
import { api, APP_URL, isConnected } from "./lib/highseat"

const SITES_KEY = "live-sites"
const cache = new Cache()

/**
 * A menu bar command also runs in the background, so it never starts a sign-in on its own. Without
 * a connection it offers one, and the person opens the browser by choosing it.
 */
async function fetchLive(siteId: string | undefined) {
  if (!(await isConnected())) return { connected: false as const }

  // A background refresh reads only the live figure. Opening the menu reloads the rest.
  const cached = cache.get(SITES_KEY)
  const isBackground = environment.launchType === LaunchType.Background
  const sites: Site[] = isBackground && cached ? JSON.parse(cached) : (await api.get("/sites")).data
  cache.set(SITES_KEY, JSON.stringify(sites))
  const site = sites.find(row => row.id === siteId) ?? sites[0]
  if (!site) return { connected: true as const, sites }

  const path = { site: site.id }
  const realtime = await api.get("/sites/{site}/realtime", { path })
  const live = realtime.data.visitors
  if (isBackground) return { connected: true as const, sites, site, live }

  const today = await api.get("/sites/{site}/overview", { path, query: { period: "day" } })
  return { connected: true as const, sites, site, live, today: today.data.visitors }
}

export default function LiveVisitors() {
  const [siteId, setSiteId] = useCachedState<string | undefined>("site-id", undefined)
  const { data, isLoading } = useCachedPromise(fetchLive, [siteId])

  if (data && !data.connected) {
    return (
      <MenuBarExtra icon={Icon.BarChart} isLoading={isLoading} tooltip="Highseat">
        <MenuBarExtra.Item
          title="Connect Highseat"
          onAction={() => launchCommand({ name: "view-sites", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    )
  }

  const stats = data && "live" in data ? data : undefined

  return (
    <MenuBarExtra
      icon={{ source: "icon.png" }}
      title={stats?.live === undefined ? undefined : formatCount(stats.live)}
      tooltip={stats?.site ? `Visitors on ${stats.site.name} right now` : "Highseat"}
      isLoading={isLoading}
    >
      {stats?.site && (
        <MenuBarExtra.Section title={stats.site.name}>
          <MenuBarExtra.Item title={`${formatCount(stats.live ?? 0)} right now`} />
          {"today" in stats && stats.today !== undefined && (
            <MenuBarExtra.Item title={`${formatCount(stats.today)} today`} />
          )}
          <MenuBarExtra.Item
            title="Open Dashboard"
            icon={Icon.Globe}
            onAction={() => open(`${APP_URL}/${stats.site?.domain}/realtime`)}
          />
        </MenuBarExtra.Section>
      )}
      {data?.connected && (
        <MenuBarExtra.Submenu title="Switch Site">
          {data.sites.map(site => (
            <MenuBarExtra.Item key={site.id} title={site.name} onAction={() => setSiteId(site.id)} />
          ))}
        </MenuBarExtra.Submenu>
      )}
    </MenuBarExtra>
  )
}
