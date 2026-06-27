import { redirect } from 'next/navigation'

// Kids & Activities has been folded into the Calendar (kid profiles, saved
// activities, trial-request bookings, recommendations all live there now).
// Keep the route as a redirect so old links/bookmarks don't dead-end.
export default function MyKidsPage() {
  redirect('/kids/calendar')
}
