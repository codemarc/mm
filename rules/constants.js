export const dispositions = {
  REPLY_NEEDED: "reply_needed", // Requires a response
  DELEGATE: "delegate", // Should be forwarded or assigned to someone else
  SCHEDULE: "schedule", // Needs to be added to calendar or scheduled
  TRACK: "track", // Keep for reference/tracking
  READ_LATER: "read_later", // Can be read when time permits
  FILE: "file", // Archive for record keeping
  DELETE: "delete" // Can be safely deleted
}

export const categories = {
  URGENT: "urgent", // Time-sensitive, requires immediate attention
  IMPORTANT: "important", // High priority but not time-critical
  ACTIONABLE: "actionable", // Requires action but not high priority
  INFORMATIVE: "informative", // Good to know, no action required
  ROUTINE: "routine", // Regular updates or notifications
  LOW: "low", // Marketing, promotions, etc.
  CONFERENCE: "conference" // Events and conferences
}
