import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api"
import { useCachedPromise, withAccessToken } from "@raycast/utils"
import { SiteStats } from "./components/site-stats"
import { formatCount, formatPercent } from "./lib/format"
import { api, APP_URL, disconnect, highseat } from "./lib/highseat"

interface SiteItemProps {
  id: string
  name: string
  domain: string
}

function SiteItem({ id, name, domain }: SiteItemProps) {
  const { data, isLoading } = useCachedPromise(
    (site: string) => api.get("/sites/{site}/overview", { path: { site }, query: { period: "7d" } }),
    [id],
  )
  const overview = data?.data

  return (
    <List.Item
      title={name}
      subtitle={domain}
      accessories={
        overview
          ? [
              { text: formatCount(overview.visitors), tooltip: "Visitors, last 7 days" },
              { text: formatCount(overview.pageviews), tooltip: "Pageviews, last 7 days" },
              { text: formatPercent(overview.bounceRate), tooltip: "Bounce rate, last 7 days" },
            ]
          : isLoading
            ? [{ icon: Icon.CircleProgress }]
            : []
      }
      actions={
        <ActionPanel>
          <Action.Push title="View Stats" icon={Icon.BarChart} target={<SiteStats site={{ id, name, domain }} />} />
          <Action.OpenInBrowser title="Open Dashboard" url={`${APP_URL}/${domain}`} />
          <Action.CopyToClipboard title="Copy Domain" content={domain} />
          <Action
            title="Disconnect Highseat"
            icon={Icon.Logout}
            style={Action.Style.Destructive}
            onAction={async () => {
              await disconnect()
              await showToast({ style: Toast.Style.Success, title: "Disconnected from Highseat" })
            }}
          />
        </ActionPanel>
      }
    />
  )
}

function Sites() {
  const { data, isLoading } = useCachedPromise(() => api.get("/sites"))

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sites">
      {data?.data.map(site => (
        <SiteItem key={site.id} id={site.id} name={site.name} domain={site.domain} />
      ))}
    </List>
  )
}

export default withAccessToken(highseat)(Sites)
