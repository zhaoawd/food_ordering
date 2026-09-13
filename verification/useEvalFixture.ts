import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system";

import registryJson from "./generated-registry.json";
import { baselineFixture, type FoodOrderingEvalFixture } from "./fixture";
import { beginEvalObservationSession } from "./observation";
import { resolveEvalFixture } from "./resolve-eval-fixture.mjs";

const SELECTION_DOCUMENT = "autophone-ui-eval-selection.json";

type EvalFixtureState =
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "failed"; message: string }>
  | Readonly<{
      status: "ready";
      fixture: FoodOrderingEvalFixture;
      mutationId: string;
      mutationEpoch: number;
      selectionNonce: string;
    }>;

function selectionUri(): string {
  if (FileSystem.documentDirectory === null) {
    throw new Error("Documents directory is unavailable");
  }
  return `${FileSystem.documentDirectory}${SELECTION_DOCUMENT}`;
}

export function useFoodOrderingEvalFixture(): EvalFixtureState {
  const [state, setState] = useState<EvalFixtureState>({ status: "pending" });

  useEffect(() => {
    let active = true;
    async function loadSelection(): Promise<void> {
      try {
        const selectionJson = await FileSystem.readAsStringAsync(selectionUri());
        const resolved = resolveEvalFixture({
          selectionJson,
          registry: registryJson,
          baselineFixture,
        });
        await beginEvalObservationSession(resolved);
        if (active) setState({ status: "ready", ...resolved });
      } catch (error) {
        if (active) {
          setState({
            status: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    void loadSelection();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
