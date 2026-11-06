import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api"
import { useCachedPromise, useCachedState, withAccessToken } from "@raycast/utils"
import type { ApiResult } from "highseat/api"
import { useState } from "react"
import { PeriodDropdown } from "./components/period-dropdown"
import type { Site } from "./components/site-picker"
import { SiteStats } from "./components/site-stats"
import { formatCount } from "./lib/format"
import { api, APP_URL, disconnect, highseat } from "./lib/highseat"
import { getOverviewFigures } from "./lib/overview"
import { DEFAULT_PERIOD, getCompare, getPeriodTitle } from "./lib/periods"

type SiteOverview = ApiResult<"/sites/overview">["data"][number]

interface SiteDetailProps {
  site: Site
  period: string
  isSelected: boolean
}

/** Every row keeps its cached figures on screen, and only the selected row calls the API. */
function SiteDetail({ site, period, isSelected }: SiteDetailProps) {
  const { data, isLoading } = useCachedPromise(
    (siteId: string, range: string) =>
      api.get("/sites/{site}/overview", {
        path: { site: siteId },
        query: { period: range, compare: getCompare(range) },
      }),
    [site.id, period],
    { execute: isSelected },
  )

  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={site.domain} text={getPeriodTitle(period)} />
          <List.Item.Detail.Metadata.Separator />
          {data &&
            getOverviewFigures(data).map(({ title, value, change }) => {
              const text = change ? `${value}  (${change})` : value
              // Raycast keeps a label's old width when its text changes, which cuts off a longer figure.
              return <List.Item.Detail.Metadata.Label key={`${title}-${text}`} title={title} text={text} />
            })}
        </List.Item.Detail.Metadata>
      }
    />
  )
}

interface SiteItemProps {
  site: SiteOverview
  period: string
  isSelected: boolean
}

function SiteItem({ site, period, isSelected }: SiteItemProps) {
  return (
    <List.Item
      id={site.id}
      title={site.name}
      keywords={[site.domain]}
      accessories={[{ text: formatCount(site.visitors), tooltip: "Visitors in the last 24 hours" }]}
      detail={<SiteDetail site={site} period={period} isSelected={isSelected} />}
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
  const { data, isLoading } = useCachedPromise(() => api.get("/sites/overview"))
  const [period, setPeriod] = useCachedState("period", DEFAULT_PERIOD)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sites = data?.data ?? []
  const activeId = selectedId ?? sites[0]?.id

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search sites"
      searchBarAccessory={<PeriodDropdown value={period} onChange={setPeriod} />}
      onSelectionChange={setSelectedId}
    >
      <List.Section title="Visitors in the Last 24 Hours">
        {sites.map(site => (
          <SiteItem key={site.id} site={site} period={period} isSelected={site.id === activeId} />
        ))}
      </List.Section>
    </List>
  )
}

export default withAccessToken(highseat)(ViewSites)
