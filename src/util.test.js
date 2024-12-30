import u from "../src/util"
import _ from "lodash"
import { describe, jest } from "@jest/globals"

// Sample config object to use in tests
const testConfig = {
  accounts: [
    { account: "personal", user: "test1@example.com" },
    { account: "work", user: "test2@example.com" },
    { account: "backup", user: "test3@example.com" }
  ]
}

describe("getAccount", () => {
  test("returns undefined when alias is undefined", () => {
    expect(u.getAccount(testConfig)).toBeUndefined()
  })

  test("returns undefined when alias is boolean", () => {
    expect(u.getAccount(testConfig, true)).toBeUndefined()
    expect(u.getAccount(testConfig, false)).toBeUndefined()
  })

  test("returns account matching string alias", () => {
    expect(u.getAccount(testConfig, "work")).toEqual(testConfig.accounts[1])
  })

  test("returns undefined for non-existent string alias", () => {
    expect(u.getAccount(testConfig, "nonexistent")).toBeUndefined()
  })

  test("returns account by numeric index (1-based)", () => {
    expect(u.getAccount(testConfig, "1")).toEqual(testConfig.accounts[0])
    expect(u.getAccount(testConfig, "2")).toEqual(testConfig.accounts[1])
    expect(u.getAccount(testConfig, "3")).toEqual(testConfig.accounts[2])
  })

  test("returns undefined for out of bounds numeric index", () => {
    expect(u.getAccount(testConfig, "4")).toBeUndefined()
    expect(u.getAccount(testConfig, "0")).toBeUndefined()
  })

  test("returns undefined for invalid numeric strings", () => {
    expect(u.getAccount(testConfig, "abc")).toBeUndefined()
    expect(u.getAccount(testConfig, "1.5")).toBeUndefined()
  })

  test("returns undefined for empty string", () => {
    expect(u.getAccount(testConfig, "")).toBeUndefined()
  })
})

describe("getAccountNames", () => {
  test("should return an array of account names", () => {
    const expected = ["personal", "work", "backup"]
    expect(u.getAccountNames(testConfig)).toEqual(expected)
  })

  test("should return empty array for config with no accounts", () => {
    const emptyConfig = {}
    expect(u.getAccountNames(emptyConfig)).toEqual([])
  })

  test("should return empty array for null config", () => {
    expect(u.getAccountNames(null)).toEqual([])
    expect(u.getAccountNames(undefined)).toEqual([])
  })

  test("should return single account name", () => {
    const singleConfig = {
      accounts: {
        personal: { host: "imap.example.com" }
      }
    }
    expect(u.getAccountNames(singleConfig)).toEqual(["personal"])
  })

  test("should handle config with empty accounts object", () => {
    const configEmptyAccounts = { accounts: {} }
    expect(u.getAccountNames(configEmptyAccounts)).toEqual([])
  })
})

describe("printAccountNames", () => {
  let logger

  beforeEach(() => {
    logger = {
      info: jest.fn()
    }
  })

  test("should print account names in quiet mode", () => {
    const options = { quiet: true }
    u.printAccountNames(testConfig, options, logger)
    expect(logger.info).toHaveBeenCalledWith("personal\nwork\nbackup")
  })

  test("should print account names with numbers when not in quiet mode", () => {
    const options = { quiet: false }
    u.printAccountNames(testConfig, options, logger)
    expect(logger.info).toHaveBeenNthCalledWith(1, "1. personal")
    expect(logger.info).toHaveBeenNthCalledWith(2, "2. work")
    expect(logger.info).toHaveBeenNthCalledWith(3, "3. backup")
  })
})

describe("roundToMinutes", () => {
  it("should round down to the nearest minute", () => {
    const date = new Date("2023-10-10T10:10:59.999Z")
    const expected = new Date("2023-10-10T10:10:00.000Z")
    expect(u.roundToMinutes(date)).toEqual(expected)
  })

  it("should handle dates with zero seconds and milliseconds", () => {
    const date = new Date("2023-10-10T10:10:00.000Z")
    const expected = new Date("2023-10-10T10:10:00.000Z")
    expect(u.roundToMinutes(date)).toEqual(expected)
  })

  it("should handle dates with non-zero seconds and milliseconds", () => {
    const date = new Date("2023-10-10T10:10:30.500Z")
    const expected = new Date("2023-10-10T10:10:00.000Z")
    expect(u.roundToMinutes(date)).toEqual(expected)
  })

  it("should handle different time zones correctly", () => {
    const date = new Date("2023-10-10T10:10:00.000+02:00")
    const expected = new Date("2023-10-10T08:10:00.000Z")
    expect(u.roundToMinutes(date)).toEqual(expected)
  })

  it("should handle invalid date inputs gracefully", () => {
    expect(() => u.roundToMinutes("invalid-date")).toThrow()
  })
})
