import { AppProvider } from "@/context/app-context"
import { AppShell } from "@/components/app-shell"

export default function Page() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
