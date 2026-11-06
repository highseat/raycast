import { Action, ActionPanel, Form, LaunchProps, popToRoot, showToast, Toast } from "@raycast/api"
import { showFailureToast, useCachedPromise, withAccessToken } from "@raycast/utils"
import { api, highseat } from "./lib/highseat"

interface NoteValues {
  site: string
  date: Date | null
  text: string
}

function formatDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function AddNote({ arguments: { text } }: LaunchProps<{ arguments: Arguments.AddNote }>) {
  const { data, isLoading } = useCachedPromise(() => api.get("/sites"))

  async function submit({ site, date, text: note }: NoteValues) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding note" })

    try {
      await api.post("/sites/{site}/notes", {
        path: { site },
        body: { date: formatDay(date ?? new Date()), text: note },
      })
      toast.style = Toast.Style.Success
      toast.title = "Note added"
      await popToRoot()
    } catch (error) {
      await toast.hide()
      await showFailureToast(error, { title: "Could not add the note" })
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Note" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="site" title="Site" storeValue>
        {data?.data.map(site => (
          <Form.Dropdown.Item key={site.id} value={site.id} title={site.name} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker id="date" title="Date" type={Form.DatePicker.Type.Date} defaultValue={new Date()} />
      <Form.TextArea id="text" title="Note" defaultValue={text} placeholder="Launched the new pricing page" />
    </Form>
  )
}

export default withAccessToken(highseat)(AddNote)
