// Keywords and patterns that indicate importance
export const importancePatterns = {
  urgent: [
    /urgent/i,
    /asap/i,
    /emergency/i,
    /immediate/i,
    /critical/i,
    /deadline.*today/i,
    /due.*today/i
  ],
  important: [
    /important/i,
    /priority/i,
    /attention required/i,
    /action needed/i,
    /please review/i,
    /deadline/i
  ],
  noise: [/promotion/i, /offer/i, /sale/i, /discount/i],
  news: [/newsletter/i],
  actionable: [/action/i, /todo/i, /please/i, /review/i, /confirm/i, /verify/i, /update required/i],
  conference: [
    // Event keywords with date patterns
    /(?:event|events|join us).*(?:on|at).*(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)\s*(?:\d{4})?/i,
    // Date with event keywords
    /(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)\s*(?:\d{4})?.*(?:event|events|join us)/i,
    // Date ranges and other conference patterns
    /(?:from|between)\s+(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)\s*(?:\d{4})?.*(?:to|through|and|-).*(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)\s*(?:\d{4})?/i
  ]
}

// Patterns that indicate disposition
export const dispositionPatterns = {
  reply_needed: [
    /\?$/,
    /please respond/i,
    /let me know/i,
    /what do you think/i,
    /your thoughts/i,
    /get back to me/i,
    /confirm receipt/i,
    /awaiting your response/i
  ],
  delegate: [
    /fwd:/i,
    /forwarded/i,
    /can someone/i,
    /who can/i,
    /take care of/i,
    /please handle/i,
    /assign to/i
  ],
  schedule: [
    /meeting/i,
    /schedule/i,
    /calendar/i,
    /appointment/i,
    /conference/i,
    /call/i,
    /zoom/i,
    /teams/i,
    /when are you free/i
  ],
  track: [
    /tracking number/i,
    /order status/i,
    /reference number/i,
    /ticket #/i,
    /case id/i,
    /for your records/i
  ]
}
