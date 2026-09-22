import { createContext, useContext } from "react";
import type { Bootstrap } from "../../shared/types";
export type AppContext = {
  data: Bootstrap | null;
  refresh: () => Promise<void>;
  setData: (b: Bootstrap | null) => void;
  toast: (s: string) => void;
};
export const Context = createContext<AppContext>(null!);
export const useApp = () => useContext(Context);
