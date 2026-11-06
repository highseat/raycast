import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api"
import { useCachedPromise, useCachedState, withAccessToken } from "@raycast/utils"
import { PeriodDropdown } from "./components/period-dropdown"
import { Site, useSites } from "./components/site-picker"
import { SiteStats } from "./components/site-stats"
import { formatCount } from "./lib/format"
import { api, APP_URL, disconnect, highseat } from "./lib/highseat"
import { getOverviewFigures } from "./lib/overview"
import { DEFAULT_PERIOD, getCompare, getPeriodTitle } from "./lib/periods"

interface SiteItemProps {
  site: Site
  period: string
}

function SiteItem({ site, period }: SiteItemProps) {
  const { data, isLoading } = useCachedPromise(
    (siteId: string, range: string) =>
      api.get("/sites/{site}/overview", {
        path: { site: siteId },
        query: { period: range, compare: getCompare(range) },
      }),
    [site.id, period],
  )

  return (
    <List.Item
      title={site.name}
      keywords={[site.domain]}
      accessories={data ? [{ text: formatCount(data.data.visitors), tooltip: "Visitors" }] : []}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            data && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title={site.domain} text={getPeriodTitle(period)} />
                <List.Item.Detail.Metadata.Separator />
                {getOverviewFigures(data).map(({ title, value, change }) => (
                  <List.Item.Detail.Metadata.Label
                    key={title}
                    title={title}
                    text={change ? `${value}  (${change})` : value}
                  />
                ))}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push title="View Stats" icon={Icon.BarChart} target={<SiteStats site={site} />} />
          <Action.OpenInBrowser title="Open Dashboard" url={`${APP_URL}/${site.domain}`} />
          <Action.CopyToClipboard title="Copy Domain" content={site.domain} />
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

function ViewSites() {
  const { sites, isLoading } = useSites()
  const [period, setPeriod] = useCachedState("period", DEFAULT_PERIOD)

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search sites"
      searchBarAccessory={<PeriodDropdown value={period} onChange={setPeriod} />}
    >
      {sites.map(site => (
        <SiteItem key={site.id} site={site} period={period} />
      ))}
    </List>
  )
}

export default withAccessToken(highseat)(ViewSites)
