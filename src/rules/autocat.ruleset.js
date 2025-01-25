import * as common from "./common.ruleset.js"
import yaml from "js-yaml"
import OpenAI from "openai"
import fs from "node:fs"
import path from "node:path"
import * as u from "../util.js"
const { dv, brief, error, info, verbose } = u

// Constants
const MINCATS = 7
const MAXCATS = 12

// ----------------------------------------------------------------------------
// OpenAI helper functions
// ----------------------------------------------------------------------------
async function suggestCategories(openai, sampleContent, currentCategories, numNeeded) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are an email classifier. Analyze these email samples and suggest additional categories that would be useful for classification. 
        Current categories: ${currentCategories.join(", ")}
        Rules:
        - Suggest ${numNeeded} new categories
        - Each category should be a single word
        - Categories should be distinct from existing ones
        - Categories should reflect common email types
        - Respond with only category names separated by commas, nothing else`
      },
      {
        role: "user",
        content: sampleContent
      }
    ],
    temperature: 0.7,
    max_tokens: 50
  })
  return completion.choices[0].message.content
}

async function classifyMessage(openai, msg, categories) {
  const content = `
Subject: ${msg.subject}
From: ${msg.from}
Text Sample: ${msg.text.join("\n").slice(0, 200)}...
`
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a message classifier. Classify the given email into exactly one of these categories: ${categories.join(", ")}. Respond with only the category name, nothing else.`
      },
      {
        role: "user",
        content: content
      }
    ],
    temperature: 0.3,
    max_tokens: 10
  })
  return completion.choices[0].message.content.trim().toLowerCase()
}

async function suggestCategoryDetails(openai, sampleContent, category) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Analyze these email samples and suggest domains and keywords for the '${category}' category.
        Rules:
        - Domains: Extract relevant email domains that typically send these types of messages
        - Keywords: Identify 3-5 key words or phrases that indicate this category
        - Respond with ONLY the YAML content, no markdown markers or other text:
          domains:
            - domain1.com
          keywords:
            - keyword1`
      },
      {
        role: "user",
        content: sampleContent
      }
    ],
    temperature: 0.5,
    max_tokens: 150
  })

  // Clean the response of any markdown or extra formatting
  const yamlContent = completion.choices[0].message.content
    .replace(/```ya?ml\s*/g, "") // Remove opening yaml marker
    .replace(/```\s*$/g, "") // Remove closing marker
    .trim()

  return yaml.load(yamlContent)
}

// ----------------------------------------------------------------------------
// Category management functions
// ----------------------------------------------------------------------------
function loadCategoryFile(catfile) {
  try {
    return yaml.load(fs.readFileSync(catfile, "utf8")) || {}
  } catch (error) {
    console.error(`Error loading category file: ${error}`)
    return {}
  }
}

function saveCategoryFile(catfile, categories) {
  try {
    fs.writeFileSync(catfile, yaml.dump(categories))
    verbose(`rule:classify: updated ${catfile}`)
  } catch (error) {
    console.error(`Error saving category file: ${error}`)
  }
}

async function updateCategories(openai, msglist, catfile) {
  // Load existing categories
  const categoryRules = loadCategoryFile(catfile)
  const categories = Object.keys(categoryRules)
  verbose(`rule:classify: loaded categories from yml: ${categories}`)

  // Return if we already have enough categories
  if (categories.length >= MAXCATS) {
    return false
  }

  // Discover new categories if needed
  if (categories.length < MINCATS) {
    // Prepare sample content
    const sampleSize = Math.min(100, msglist.length)
    const sampleContent = msglist
      .slice(0, sampleSize)
      .map(
        (msg) => `
Subject: ${msg.subject}
From: ${msg.from}
Text: ${msg?.text?.join("\n")?.slice(0, 200)}...
---`
      )
      .join("\n")

    try {
      // Get new category suggestions
      const suggestion = await suggestCategories(
        openai,
        sampleContent,
        categories,
        MINCATS - categories.length
      )

      // Process new categories
      const newCategories = suggestion
        .trim()
        .toLowerCase()
        .split(",")
        .map((c) => c.trim())
        .filter((c) => !categories.includes(c))

      verbose(`rule:classify: discovered new categories: ${newCategories.join(", ")}`)

      // Add new categories to rules file with analyzed domains and keywords
      for (const cat of newCategories) {
        const details = await suggestCategoryDetails(openai, sampleContent, cat)
        categoryRules[cat] = {
          domains: details?.domains || [],
          keywords: details?.keywords || []
        }
      }

      // Ensure undefined category exists
      // biome-ignore lint/complexity/useLiteralKeys: <explanation>
      if (!categoryRules["undefined"]) {
        // biome-ignore lint/complexity/useLiteralKeys: <explanation>
        categoryRules["undefined"] = {
          domains: [],
          keywords: []
        }
      }

      // Save updated categories
      saveCategoryFile(catfile, categoryRules)
      return true
    } catch (error) {
      console.error(`Error discovering categories: ${error}`)
      return false
    }
  }

  return false
}

// ----------------------------------------------------------------------------
// Main classify function
// ----------------------------------------------------------------------------
export async function classify(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  const { account } = acct
  const catfile = path.join(process.cwd(), "data", `${account.name}.cats.yml`)

  const openai = new OpenAI({
    apiKey: process.env.MM_OPENAI_API_KEY
  })

  // Update categories file if needed
  const updated = await updateCategories(openai, msglist, catfile)
  verbose("categories updated")

  // Always use common.classify to do the actual classification
  return common.classify(msglist, ...args)
}

// ----------------------------------------------------------------------------
// pick rule
// ----------------------------------------------------------------------------
export async function pick(msglist, ...args) {
  return common.pick(msglist, ...args)
}

// ----------------------------------------------------------------------------
// parse rule
// ----------------------------------------------------------------------------
export async function parse(msglist, ...args) {
  return common.parse(msglist, ...args)
}

// ----------------------------------------------------------------------------
// save load
// ----------------------------------------------------------------------------
export async function load(msglist, ...args) {
  return common.load(msglist, ...args)
}

// ----------------------------------------------------------------------------
// save rule
// ----------------------------------------------------------------------------
export async function save(msglist, ...args) {
  return common.save(msglist, ...args)
}
