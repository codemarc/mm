import yaml from "js-yaml"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load and parse the YAML file
const domainsPath = path.join(__dirname, "domains.yaml")
const domainsFile = fs.readFileSync(domainsPath, "utf8")
const domains = yaml.load(domainsFile)

// Export the domain lists
export const spamDomains = domains.spam_domains
export const laterDomains = domains.later_domains
