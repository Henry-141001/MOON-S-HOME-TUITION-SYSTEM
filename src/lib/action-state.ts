// Shape returned by every server action that a form displays (client-safe).
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Timestamp so repeated identical results still re-render messages. */
  at?: number;
  /** Parent login only: this Parent ID has a PIN, so ask for it next. */
  needPin?: boolean;
};

export const initialState: ActionState = { status: "idle" };
