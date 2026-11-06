import { Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api"
import { useCachedPromise, useCachedState } from "@raycast/utils"
import { formatCount } from "./lib/format"
import { api, APP_URL, isConnected } from "./lib/highseat"

/**
 * A menu bar command also runs in the background, so it never starts a sign-in on its own. Without
 * a connection it offers one, and the person opens the browser by choosing it.
 */
async function fetchLive(siteId: string | undefined) {
  if (!(await isConnected())) return { connected: false as const }

  const { data: sites } = await api.get("/sites")
  const site = sites.find(row => row.id === siteId) ?? sites[0]
  if (!site) return { connected: true as const, sites }

  const path = { site: site.id }
  const [realtime, today] = await Promise.all([
    api.get("/sites/{site}/realtime", { path }),
    api.get("/sites/{site}/overview", { path, query: { period: "day" } }),
  ])

  return { connected: true as const, sites, site, live: realtime.data.visitors, today: today.data.visitors }
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

  const live = data && "live" in data ? data : undefined

  return (
    <MenuBarExtra
      icon={{ source: "icon.png" }}
      title={live ? formatCount(live.live ?? 0) : undefined}
      tooltip={live?.site ? `Visitors on ${live.site.name} right now` : "Highseat"}
      isLoading={isLoading}
    >
      {live?.site && (
        <MenuBarExtra.Section title={live.site.name}>
          <MenuBarExtra.Item title={`${formatCount(live.live ?? 0)} right now`} />
          <MenuBarExtra.Item title={`${formatCount(live.today ?? 0)} today`} />
          <MenuBarExtra.Item
            title="Open Dashboard"
            icon={Icon.Globe}
            onAction={() => open(`${APP_URL}/${live.site?.domain}/realtime`)}
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
