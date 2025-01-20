import { OpenAIClient } from "openai"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIClient(configuration)

async function generateCategories(items, options = {}) {
  const { topic = "general", textField = "subject", categoryCount = "5-8" } = options

  const texts = items.map((item) => item[textField])

  const prompt = `As an expert in ${topic}, analyze these items and create ${categoryCount} relevant categories that best organize them.
    Return only a comma-separated list of categories, nothing else.

    Items to analyze:
    ${texts.join("\n")}`

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 100
  })

  const categoriesString = completion.choices[0].message.content.trim()
  return categoriesString.split(",").map((cat) => cat.trim())
}

async function categorizeItem(text, categories, topic = "general") {
  const prompt = `As an expert in ${topic}, categorize the following text into one of these categories: 
    ${categories.join(", ")}
    
    Text: "${text}"
    
    Return only the category name, nothing else.`

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 20
  })

  return completion.choices[0].message.content.trim()
}

async function categorizeData(options = {}) {
  const {
    inputPath,
    outputPath,
    topic = "general",
    textField = "subject",
    categoryField = "category",
    categoryCount = "5-8"
  } = options

  try {
    // Read the JSON file
    const jsonPath = path.resolve(process.cwd(), inputPath)
    const data = JSON.parse(await fs.readFile(jsonPath, "utf8"))

    // Generate categories based on the content
    console.log("Generating categories...")
    const categories = await generateCategories(data, { topic, textField, categoryCount })
    console.log("Generated categories:", categories)

    // Process each item with the generated categories
    console.log("Categorizing items...")
    const categorizedData = await Promise.all(
      data.map(async (item) => {
        const category = await categorizeItem(item[textField], categories, topic)
        return {
          ...item,
          [categoryField]: category
        }
      })
    )

    // Write the categorized data
    const outputFilePath = outputPath || inputPath
    await fs.writeFile(outputFilePath, JSON.stringify(categorizedData, null, 2), "utf8")

    console.log("Successfully categorized all items!")
    return categorizedData
  } catch (error) {
    console.error("Error:", error)
    throw error
  }
}

// Example usage when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = {
    inputPath: "data/codemarc.news.first.json",
    outputPath: "data/codemarc.news.categorized.json", // Optional
    topic: "news and current events",
    textField: "subject",
    categoryField: "category",
    categoryCount: "5-8"
  }

  categorizeData(options)
}

export default categorizeData
