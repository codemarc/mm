import { categories, dispositions } from "./constants.js"
import { importancePatterns, dispositionPatterns } from "./patterns.js"

// Function to determine message importance
export function getMessageImportance(msg, acct) {
  const content = [msg.subject, ...(Array.isArray(msg.text) ? msg.text : [msg.text])]
    .join(" ")
    .toLowerCase()

  const senderEmail = msg.senderEmail
  const senderDomain = msg.senderEmail?.split("@")[1]

  // Check for LinkedIn emails
  if (senderDomain?.endsWith("linkedin.com")) {
    return categories.ROUTINE
  }

  // Check sender importance (you might want to customize this based on your contacts)
  const isImportantSender = senderDomain === acct.domain // Emails from same organization

  // Check for conference/event patterns first
  if (importancePatterns.conference.some((pattern) => pattern.test(content))) {
    return categories.CONFERENCE
  }

  // Check for urgent patterns
  if (importancePatterns.urgent.some((pattern) => pattern.test(content))) {
    return categories.URGENT
  }

  // Check for important patterns with important sender
  if (isImportantSender && importancePatterns.important.some((pattern) => pattern.test(content))) {
    return categories.IMPORTANT
  }

  // Check for actionable patterns
  if (importancePatterns.actionable.some((pattern) => pattern.test(content))) {
    return categories.ACTIONABLE
  }

  // If from same organization but no specific patterns
  if (isImportantSender) {
    return categories.INFORMATIVE
  }

  // Check for common marketing or promotional content
  if (
    importancePatterns.noise.some((pattern) => pattern.test(content)) ||
    importancePatterns.news.some((pattern) => pattern.test(content))
  ) {
    return categories.LOW
  }

  // Default category for everything else
  return categories.ROUTINE
}

// Function to determine message disposition
export function getMessageDisposition(msg, category) {
  // Check for cleaner@codemarc.net recipient
  if (msg.recipientEmail === "cleaner@codemarc.net") {
    return dispositions.DELETE
  }

  // Check for noreply senders
  if (msg.senderEmail?.includes("noreply@")) {
    return dispositions.DELETE
  }

  // Check sender domain
  const senderDomain = msg.senderEmail?.split("@")[1]
  if (
    senderDomain?.endsWith("wiseprofitstrategy.com") ||
    senderDomain?.endsWith("bullseyeoptiontrading.com") ||
    senderDomain?.endsWith("expireinthemoney.com")
  ) {
    return dispositions.DELETE
  }

  // Check for LinkedIn emails
  if (senderDomain?.endsWith("linkedin.com")) {
    return dispositions.READ_LATER
  }

  // Check for Medium newsletter
  if (msg.senderEmail === "newsletters@medium.com") {
    return dispositions.READ_LATER
  }

  const content = [msg.subject, ...(Array.isArray(msg.text) ? msg.text : [msg.text])]
    .join(" ")
    .toLowerCase()

  // Check for scheduling patterns first since they're more specific
  if (dispositionPatterns.schedule.some((pattern) => pattern.test(content))) {
    return dispositions.SCHEDULE
  }

  // Check for reply patterns
  if (dispositionPatterns.reply_needed.some((pattern) => pattern.test(content))) {
    return dispositions.REPLY_NEEDED
  }

  // Check for delegation patterns
  if (dispositionPatterns.delegate.some((pattern) => pattern.test(content))) {
    return dispositions.DELEGATE
  }

  // Check for tracking patterns
  if (dispositionPatterns.track.some((pattern) => pattern.test(content))) {
    return dispositions.TRACK
  }

  // Determine disposition based on category if no specific patterns found
  switch (category) {
    case categories.URGENT:
    case categories.IMPORTANT:
      return dispositions.REPLY_NEEDED
    case categories.ACTIONABLE:
      return dispositions.TRACK
    case categories.INFORMATIVE:
      return dispositions.READ_LATER
    case categories.LOW:
      return dispositions.DELETE
    default:
      return dispositions.FILE
  }
}
