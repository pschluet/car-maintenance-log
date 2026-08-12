import { describe, expect, it } from "vitest";
import { keys } from "@/lib/db";

describe("key builders", () => {
  it("builds a car's primary key and GSI key", () => {
    expect(keys.car("car-1")).toEqual({ pk: "CAR#car-1", sk: "META" });
    expect(keys.carGsi("Sarah's CR-V")).toEqual({ gsi1pk: "CARS", gsi1sk: "sarah's cr-v" });
  });

  it("scopes tire sets and docs under the car's partition", () => {
    expect(keys.tireSet("car-1", "ts-1")).toEqual({ pk: "CAR#car-1", sk: "TIRESET#ts-1" });
    expect(keys.carDoc("car-1", "INSURANCE", "doc-1")).toEqual({
      pk: "CAR#car-1",
      sk: "DOC#INSURANCE#doc-1",
    });
  });

  it("embeds the date in an entry's sort key so date-descending is free", () => {
    expect(keys.entry("car-1", "2026-08-11", "e-1")).toEqual({
      pk: "CAR#car-1",
      sk: "ENTRY#2026-08-11#e-1",
    });
  });

  it("builds mechanic and user keys", () => {
    expect(keys.mechanic("m-1")).toEqual({ pk: "MECHANIC#m-1", sk: "META" });
    expect(keys.mechanicGsi("Joe's Garage")).toEqual({
      gsi1pk: "MECHANICS",
      gsi1sk: "joe's garage",
    });
    expect(keys.user("sub-1")).toEqual({ pk: "USER#sub-1", sk: "META" });
    expect(keys.userGsi("Person@Example.com")).toEqual({
      gsi1pk: "USERS",
      gsi1sk: "person@example.com",
    });
  });
});
