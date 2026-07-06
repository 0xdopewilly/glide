import { describe, expect, it } from "vitest";
import {
  parseAgentJson,
  parseSaveRuleFromMessage,
  parseScheduleRuleFromMessage,
  parseThresholdRuleFromMessage,
} from "@/lib/agent-intents";

// Billy's deterministic parsers are the safety net beneath the LLM. These tests
// pin the behavior that matters most: correct rule extraction, and — critically
// — NOT hijacking questions or one-off sends into automation rules.

describe("parseSaveRuleFromMessage (save N% on receive)", () => {
  it("parses a clear save rule", () => {
    expect(parseSaveRuleFromMessage("save 10% of every payment")).toMatchObject({
      action: "rule",
      ruleType: "save_on_receive",
      percent: 10,
      token: "USDC",
    });
  });

  it("detects EURC", () => {
    expect(
      parseSaveRuleFromMessage("save 25% of each EURC payment I receive")?.token,
    ).toBe("EURC");
  });

  it("ignores questions", () => {
    expect(
      parseSaveRuleFromMessage("how do I save 10% of every payment?"),
    ).toBeNull();
  });

  it("ignores a one-off 'save $10' (no percent, not recurring)", () => {
    expect(parseSaveRuleFromMessage("save $10")).toBeNull();
  });

  it("rejects an out-of-range percent", () => {
    expect(parseSaveRuleFromMessage("save 500% of every payment")).toBeNull();
  });
});

describe("parseThresholdRuleFromMessage (balance ceiling)", () => {
  it("parses 'keep my balance under $5,000'", () => {
    expect(parseThresholdRuleFromMessage("keep my balance under $5,000")).toMatchObject(
      { ruleType: "threshold_save", thresholdAmount: "5000.00" },
    );
  });

  it("parses 'move anything over $1000 to savings'", () => {
    expect(
      parseThresholdRuleFromMessage("move anything over $1000 to savings"),
    ).toMatchObject({ thresholdAmount: "1000.00" });
  });

  it("ignores questions and unrelated sends", () => {
    expect(parseThresholdRuleFromMessage("what is my balance?")).toBeNull();
    expect(parseThresholdRuleFromMessage("send $50 to @bob")).toBeNull();
  });
});

describe("parseScheduleRuleFromMessage (recurring send)", () => {
  it("parses 'send $500 to @bob every month'", () => {
    expect(
      parseScheduleRuleFromMessage("send $500 to @bob every month"),
    ).toMatchObject({
      ruleType: "scheduled_send",
      amount: "500.00",
      destination: "bob",
      frequency: "monthly",
    });
  });

  it("maps a weekday to weekly", () => {
    expect(
      parseScheduleRuleFromMessage("pay @sue $200 every friday")?.frequency,
    ).toBe("weekly");
  });

  it("does NOT hijack a one-off send (no cadence)", () => {
    expect(parseScheduleRuleFromMessage("send $50 to @bob")).toBeNull();
  });

  it("needs an explicit recipient ('pay rent monthly' → null so Billy asks)", () => {
    expect(parseScheduleRuleFromMessage("pay rent monthly")).toBeNull();
  });
});

describe("parseAgentJson (LLM output → intent)", () => {
  it("parses a save rule", () => {
    expect(
      parseAgentJson('{"action":"rule","ruleType":"save_on_receive","percent":10}'),
    ).toMatchObject({ action: "rule", ruleType: "save_on_receive", percent: 10 });
  });

  it("parses a scheduled_send rule", () => {
    expect(
      parseAgentJson(
        '{"action":"rule","ruleType":"scheduled_send","amount":"500.00","destination":"bob","frequency":"monthly"}',
      ),
    ).toMatchObject({ ruleType: "scheduled_send", frequency: "monthly" });
  });

  it("rejects scheduled_send with an invalid frequency", () => {
    expect(
      parseAgentJson(
        '{"action":"rule","ruleType":"scheduled_send","amount":"5","destination":"bob","frequency":"hourly"}',
      ),
    ).toBeNull();
  });

  it("parses a threshold rule", () => {
    expect(
      parseAgentJson('{"action":"rule","ruleType":"threshold_save","thresholdAmount":"1000"}'),
    ).toMatchObject({ ruleType: "threshold_save" });
  });

  it("still parses a basic send", () => {
    expect(
      parseAgentJson(
        '{"action":"send","amount":"5.00","to":"0x1234567890123456789012345678901234567890"}',
      ),
    ).toMatchObject({ action: "send", amount: "5.00" });
  });

  it("returns null on non-JSON", () => {
    expect(parseAgentJson("not json at all")).toBeNull();
  });
});

describe("parser edge cases", () => {
  it("save: 'auto-save 15% of all income' → 15%", () => {
    expect(parseSaveRuleFromMessage("auto-save 15% of all income")).toMatchObject({
      ruleType: "save_on_receive",
      percent: 15,
    });
  });

  it("threshold: 'maintain at least $1000' → null (minimums unsupported, by design)", () => {
    expect(parseThresholdRuleFromMessage("maintain at least $1000")).toBeNull();
  });

  it("schedule: comma amount + 0x recipient + weekly", () => {
    const addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    expect(
      parseScheduleRuleFromMessage(`send $1,000 to ${addr} every week`),
    ).toMatchObject({
      ruleType: "scheduled_send",
      amount: "1000.00",
      destination: addr,
      frequency: "weekly",
    });
  });

  it("schedule: 'pay @bob $50 every day' → daily", () => {
    expect(
      parseScheduleRuleFromMessage("pay @bob $50 every day")?.frequency,
    ).toBe("daily");
  });

  it("agent JSON: reply and navigate still pass through", () => {
    expect(parseAgentJson('{"action":"reply","message":"hi"}')).toMatchObject({
      action: "reply",
    });
    expect(parseAgentJson('{"action":"navigate","path":"/automations"}')).toMatchObject(
      { action: "navigate", path: "/automations" },
    );
  });
});
