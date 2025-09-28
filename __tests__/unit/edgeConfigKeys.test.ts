import { ecGet, ecGetAll } from "@/lib/storage/edgeConfig";
import { ecBatchUpdate } from "@/lib/storage/edgeConfigWrite";

describe("Edge Config key normalization", () => {
  test("upsert and get with colon keys works via normalization", async () => {
    const k = "forum:index";
    const v = { hello: "world" } as const;
    await ecBatchUpdate([{ operation: "upsert", key: k, value: v }]);
    const got = await ecGet<typeof v>(k);
    expect(got).toEqual(v);
  });

  test("getAll returns values keyed by original requested keys", async () => {
    const k1 = "forum:users:usr_abc";
    const k2 = "forum:posts:pst_def";
    await ecBatchUpdate([
      { operation: "upsert", key: k1, value: { id: "usr_abc" } },
      { operation: "upsert", key: k2, value: { id: "pst_def" } },
    ]);
    const res = await ecGetAll([k1, k2]);
    expect(Object.keys(res).sort()).toEqual([k1, k2].sort());
    expect((res[k1] as any).id).toBe("usr_abc");
    expect((res[k2] as any).id).toBe("pst_def");
  });
});
