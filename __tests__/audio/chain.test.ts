import { rebuildEffectChain } from "@/lib/audio/effects/chain";
import type { LayerEffect } from "@/lib/audio/types";

// Minimal mock AudioNode that records connections
class MockNode {
  connections: MockNode[] = [];
  constructor(public name: string) {}
  connect = (target: any) => {
    this.connections.push(target);
    return target;
  };
  disconnect = () => {
    this.connections = [];
  };
}

describe("rebuildEffectChain utility", () => {
  test("chains effects in order when handles expose input/output gains", () => {
    const input = new MockNode("input") as any as AudioNode;
    const output = new MockNode("output") as any as AudioNode;
    const ctx = {} as AudioContext; // not used directly in current implementation

    function makeHandle(id: string) {
      return {
        inputGain: new MockNode(id + ":in") as any as AudioNode,
        outputGain: new MockNode(id + ":out") as any as AudioNode,
      };
    }

    const tremoloMap = new Map<string, any>([["t1", makeHandle("t1")]]);
    const chorusMap = new Map<string, any>([["c1", makeHandle("c1")]]);

    const maps: any = { tremolo: tremoloMap, chorus: chorusMap };

    const effects: LayerEffect[] = [
      { id: "t1", kind: "tremolo" },
      { id: "c1", kind: "chorus" },
    ] as any; // casting to satisfy subset

    rebuildEffectChain(effects, maps, input, output, ctx);

    // Expect input connected to tremolo input
    const tremIn = (input as any).connections[0];
    expect(tremIn.name).toBe("t1:in");
    // tremolo output should connect to chorus input
    const tremOut = maps.tremolo.get("t1").outputGain as any;
    const tremOutConnections = tremOut.connections;
    expect(tremOutConnections[0].name).toBe("c1:in");
    // chorus output connects to final output
    const chorusOut = maps.chorus.get("c1").outputGain as any;
    expect(chorusOut.connections[0]).toBe(output);
  });

  test("falls back to direct connection when no chainable effects", () => {
    const input = new MockNode("input") as any as AudioNode;
    const output = new MockNode("output") as any as AudioNode;
    rebuildEffectChain([], {}, input, output, {} as AudioContext);
    // Direct connect from input to output should have occurred
    expect((input as any).connections[0]).toBe(output);
  });
});
