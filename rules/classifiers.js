// This module contains functions to determine the importance and disposition of
// messages based on their content, sender, and other attributes. It uses
// predefined patterns and categories to classify messages.

import { categories, dispositions } from "./constants.js"
import { importancePatterns, dispositionPatterns } from "./patterns.js"
import { spamDomains, laterDomains } from "./domain-lists.js"

// Function to determine message importance
export function getMessageImportance(msg, acct) {
  const content = [msg.subject, ...(Array.isArray(msg.text) ? msg.text : [msg.text])]
    .join(" ")
    .toLowerCase()

  const senderEmail = msg.senderEmail
  const senderDomain = senderEmail?.split("@")[1]

  // Check for LinkedIn emails
  if (senderDomain === "linkedin.com") {
    return [categories.ROUTINE, "linkedin.com domain"]
  }

  // Check sender importance
  const isImportantSender = senderDomain === acct.domain

  // Check for conference/event patterns first
  if (importancePatterns.conference.some((pattern) => pattern.test(content))) {
    return [categories.CONFERENCE, "conference pattern match"]
  }

  // Check for urgent patterns
  if (importancePatterns.urgent.some((pattern) => pattern.test(content))) {
    return [categories.URGENT, "urgent pattern match"]
  }

  // Check for important patterns with important sender
  if (isImportantSender && importancePatterns.important.some((pattern) => pattern.test(content))) {
    return [categories.IMPORTANT, "important pattern match from organization sender"]
  }

  // Check for actionable patterns
  if (importancePatterns.actionable.some((pattern) => pattern.test(content))) {
    return [categories.ACTIONABLE, "actionable pattern match"]
  }

  // If from same organization but no specific patterns
  if (isImportantSender) {
    return [categories.INFORMATIVE, "sender from same organization"]
  }

  // Check for common marketing or promotional content
  if (
    importancePatterns.noise.some((pattern) => pattern.test(content)) ||
    importancePatterns.news.some((pattern) => pattern.test(content))
  ) {
    return [categories.LOW, "marketing/promotional pattern match"]
  }

  // Default category for everything else
  return [categories.ROUTINE, "default category"]
}

// Function to determine message disposition
export function getMessageDisposition(msg, category) {
  // Check for cleaner@codemarc.net recipient
  if (msg.recipientEmail === "cleaner@codemarc.net") {
    return [dispositions.DELETE, "cleaner email recipient"]
  }

  // Check sender domain
  const senderDomain = msg.senderEmail?.split("@")[1]
  if (spamDomains.some((domain) => senderDomain?.endsWith(domain))) {
    return [dispositions.DELETE, "spam domain match"]
  }

  if (laterDomains.some((domain) => senderDomain?.endsWith(domain))) {
    return [dispositions.READ_LATER, "read later domain match"]
  }

  const content = [msg.subject, ...(Array.isArray(msg.text) ? msg.text : [msg.text])]
    .join(" ")
    .toLowerCase()

  // Check for scheduling patterns first since they're more specific
  if (dispositionPatterns.schedule.some((pattern) => pattern.test(content))) {
    return [dispositions.SCHEDULE, "schedule pattern match"]
  }

  // Check for reply patterns
  if (dispositionPatterns.reply_needed.some((pattern) => pattern.test(content))) {
    return [dispositions.REPLY_NEEDED, "reply needed pattern match"]
  }

  // Check for delegation patterns
  if (dispositionPatterns.delegate.some((pattern) => pattern.test(content))) {
    return [dispositions.DELEGATE, "delegation pattern match"]
  }

  // Check for tracking patterns
  if (dispositionPatterns.track.some((pattern) => pattern.test(content))) {
    return [dispositions.TRACK, "tracking pattern match"]
  }

  // Determine disposition based on category if no specific patterns found
  switch (category) {
    case categories.URGENT:
    case categories.IMPORTANT:
      return [dispositions.REPLY_NEEDED, "based on urgent/important category"]
    case categories.ACTIONABLE:
      return [dispositions.TRACK, "based on actionable category"]
    case categories.INFORMATIVE:
      return [dispositions.READ_LATER, "based on informative category"]
    case categories.LOW:
      return [dispositions.DELETE, "based on low category"]
    default:
      return [dispositions.FILE, "default disposition"]
  }
}
