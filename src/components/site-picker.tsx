import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api"
import { useCachedPromise, useCachedState } from "@raycast/utils"
import { api } from "../lib/highseat"

export interface Site {
  id: string
  name: string
  domain: string
}

/** The sites of the connection and the one last picked, which every site command shares. */
export function useSelectedSite() {
  const { data, isLoading } = useCachedPromise(() => api.get("/sites"))
  const [siteId, setSiteId] = useCachedState<string | undefined>("site-id", undefined)
  const sites: Site[] = data?.data ?? []

  return {
    sites,
    site: sites.find(site => site.id === siteId) ?? sites[0],
    setSiteId,
    isLoading,
  }
}

interface SwitchSiteActionProps {
  sites: Site[]
  onSelect: (siteId: string) => void
}

export function SwitchSiteAction({ sites, onSelect }: SwitchSiteActionProps) {
  return (
    <ActionPanel.Submenu title="Switch Site" icon={Icon.Switch} shortcut={Keyboard.Shortcut.Common.Save}>
      {sites.map(site => (
        <Action key={site.id} title={site.name} onAction={() => onSelect(site.id)} />
      ))}
    </ActionPanel.Submenu>
  )
}
