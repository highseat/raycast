import { Action, ActionPanel, Color, List } from "@raycast/api"
import type { ReactElement } from "react"
import { useCachedPromise, useCachedState } from "@raycast/utils"
import { formatChange, formatCount, formatDuration, formatMoney, formatPercent } from "../lib/format"
import { api, APP_URL } from "../lib/highseat"
import { DEFAULT_PERIOD } from "../lib/periods"
import { PeriodDropdown } from "./period-dropdown"
import { Site, SwitchSiteAction } from "./site-picker"

const ROWS_PER_SECTION = 5

interface SiteStatsProps {
  site: Site
  sites?: Site[]
  onSwitchSite?: (siteId: string) => void
}

interface StatItemProps {
  title: string
  value: string
  change?: string
  /** True when a lower figure is the good direction, as for a bounce rate. */
  lowerIsBetter?: boolean
  actions: ReactElement
}

function getChangeColor(change: string, lowerIsBetter?: boolean) {
  const isUp = change.startsWith("+")
  if (change === "0%") return Color.SecondaryText
  return isUp === !lowerIsBetter ? Color.Green : Color.Red
}

function StatItem({ title, value, change, lowerIsBetter, actions }: StatItemProps) {
  return (
    <List.Item
      title={title}
      accessories={[
        ...(change ? [{ tag: { value: change, color: getChangeColor(change, lowerIsBetter) } }] : []),
        { text: value },
      ]}
      actions={actions}
    />
  )
}

async function fetchStats(site: string, period: string) {
  // All time has no earlier range to compare with.
  const compare = period === "all" ? "off" : "previous"
  const limit = ROWS_PER_SECTION
  const [overview, pages, sources, countries] = await Promise.all([
    api.get("/sites/{site}/overview", { path: { site }, query: { period, compare } }),
    api.get("/sites/{site}/pages", { path: { site }, query: { period, limit } }),
    api.get("/sites/{site}/sources", { path: { site }, query: { period, limit } }),
    api.get("/sites/{site}/locations", { path: { site }, query: { period, limit } }),
  ])

  return { overview, pages: pages.data, sources: sources.data, countries: countries.data }
}

export function SiteStats({ site, sites = [], onSwitchSite }: SiteStatsProps) {
  const [period, setPeriod] = useCachedState("period", DEFAULT_PERIOD)
  const { data, isLoading } = useCachedPromise(fetchStats, [site.id, period])
  const overview = data?.overview.data
  const previous = overview?.previous
  const currency = data?.overview.meta.currency ?? "USD"

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Dashboard" url={`${APP_URL}/${site.domain}`} />
      {onSwitchSite && <SwitchSiteAction sites={sites} onSelect={onSwitchSite} />}
    </ActionPanel>
  )

  return (
    <List
      isLoading={isLoading}
      navigationTitle={site.name}
      searchBarPlaceholder={`Filter ${site.domain}`}
      searchBarAccessory={<PeriodDropdown value={period} onChange={setPeriod} />}
    >
      {overview && (
        <List.Section title="Overview">
          <StatItem
            title="Visitors"
            value={formatCount(overview.visitors)}
            change={formatChange(overview.visitors, previous?.visitors)}
            actions={actions}
          />
          <StatItem
            title="Pageviews"
            value={formatCount(overview.pageviews)}
            change={formatChange(overview.pageviews, previous?.pageviews)}
            actions={actions}
          />
          <StatItem
            title="Sessions"
            value={formatCount(overview.sessions)}
            change={formatChange(overview.sessions, previous?.sessions)}
            actions={actions}
          />
          <StatItem
            title="Bounce Rate"
            value={formatPercent(overview.bounceRate)}
            change={formatChange(overview.bounceRate, previous?.bounceRate)}
            lowerIsBetter
            actions={actions}
          />
          <StatItem
            title="Session Duration"
            value={formatDuration(overview.avgDuration)}
            change={formatChange(overview.avgDuration, previous?.avgDuration)}
            actions={actions}
          />
          {overview.hasRevenue && (
            <StatItem
              title="Revenue"
              value={formatMoney(overview.revenue, currency)}
              change={formatChange(overview.revenue, previous?.revenue)}
              actions={actions}
            />
          )}
        </List.Section>
      )}
      <List.Section title="Top Pages">
        {data?.pages.map(page => (
          <StatItem key={page.path} title={page.path} value={formatCount(page.visitors)} actions={actions} />
        ))}
      </List.Section>
      <List.Section title="Top Sources">
        {data?.sources.map(source => (
          // An empty name is direct traffic.
          <StatItem
            key={source.name}
            title={source.name || "Direct"}
            value={formatCount(source.visitors)}
            actions={actions}
          />
        ))}
      </List.Section>
      <List.Section title="Top Countries">
        {data?.countries.map(country => (
          // An empty name is a visitor whose country could not be resolved.
          <StatItem
            key={country.name}
            title={country.name || "Unknown"}
            value={formatCount(country.visitors)}
            actions={actions}
          />
        ))}
      </List.Section>
    </List>
  )
}
