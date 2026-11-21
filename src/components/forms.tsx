"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { buttonClass, cn } from "@/components/ui";
import { initialState, type ActionState } from "@/lib/action-state";

type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>(initialState);
const FormPendingContext = createContext(false);
const ModalContext = createContext<{ close: () => void } | null>(null);

/**
 * Read-only (super admin / Pemerhati) mode. When true, every form below is
 * disabled, save buttons and modal/inline action buttons are hidden.
 * The server rejects changes anyway — this just keeps the screen honest.
 */
const ReadOnlyContext = createContext(false);

export function ReadOnlyProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <ReadOnlyContext value={value}>{children}</ReadOnlyContext>;
}

export function useReadOnly() {
  return useContext(ReadOnlyContext);
}

/**
 * A form wired to a server action. Shows success/error messages, exposes
 * field errors to <Field>, and can reset itself or close its modal on success.
 *
 * Submits via onSubmit (not the `action` prop) so React does NOT clear the
 * fields when validation fails — the user keeps what they typed.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  closeOnSuccess = true,
  showSuccess = true,
  onSuccess,
  id,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  closeOnSuccess?: boolean;
  showSuccess?: boolean;
  onSuccess?: () => void;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const modal = useContext(ModalContext);
  const readOnly = useReadOnly();
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (state.status !== "success") return;
    if (resetOnSuccess) formRef.current?.reset();
    onSuccessRef.current?.();
    if (closeOnSuccess && modal) modal.close();
    // Only react to a new result (state.at), not to re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.at]);

  return (
    <FormStateContext value={state}>
      <FormPendingContext value={pending}>
        <form
          ref={formRef}
          // Fallback before the page is interactive: React renders this as a real POST to
          // the server action, so an early tap still saves (and never puts data in the URL).
          // Once hydrated, onSubmit below takes over and prevents the default submit.
          action={formAction}
          className={className}
          id={id}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (pending || readOnly) return;
            const formData = new FormData(e.currentTarget);
            const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            if (submitter?.name) formData.set(submitter.name, submitter.value);
            startTransition(() => formAction(formData));
          }}
        >
          {/* A disabled fieldset disables every input and button inside it. */}
          <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
            {children}
          </fieldset>
          <FormMessage state={state} showSuccess={showSuccess && !(closeOnSuccess && modal)} />
        </form>
      </FormPendingContext>
    </FormStateContext>
  );
}

/** Pending state for buttons inside ActionForm or a plain action form. */
function usePending() {
  const { pending } = useFormStatus();
  return useContext(FormPendingContext) || pending;
}

export function useFormState() {
  return useContext(FormStateContext);
}

function FormMessage({ state, showSuccess }: { state: ActionState; showSuccess: boolean }) {
  const [hidden, setHidden] = useState<number | undefined>(undefined);
  if (!state.message || state.status === "idle" || hidden === state.at) return null;
  if (state.status === "success" && !showSuccess) return null;
  const isError = state.status === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "mt-4 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm",
        isError ? "bg-rose-soft text-rose-ink" : "bg-success-soft text-success-ink",
      )}
    >
      {isError ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      <span className="flex-1">{state.message}</span>
      <button type="button" onClick={() => setHidden(state.at)} className="opacity-60 hover:opacity-100" aria-label="Tutup">
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Label + control + field error from the surrounding ActionForm. */
export function Field({
  label,
  name,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const state = useFormState();
  const error = state.fieldErrors?.[name];
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-[13px] font-medium text-ink-soft">
        {label}
        {required && <span className="ml-0.5 text-rose-ink">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rose-ink">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FieldError({ name }: { name: string }) {
  const error = useFormState().fieldErrors?.[name];
  return error ? <p className="mt-1 text-xs text-rose-ink">{error}</p> : null;
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  pendingText = "Menyimpan…",
  ...rest
}: Omit<ComponentProps<"button">, "type"> & {
  variant?: "primary" | "secondary" | "danger" | "soft" | "ghost";
  size?: "sm" | "md" | "lg";
  pendingText?: string;
}) {
  const pending = usePending();
  const readOnly = useReadOnly();
  if (readOnly) return null;
  return (
    <button type="submit" disabled={pending || rest.disabled} className={buttonClass(variant, size, className)} {...rest}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? pendingText : children}
    </button>
  );
}

/** Submit button that asks for confirmation first (delete, deactivate, …). */
export function ConfirmButton({
  message,
  children,
  variant = "danger",
  size = "sm",
  className,
  name,
  value,
}: {
  message: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "soft" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  name?: string;
  value?: string;
}) {
  const pending = usePending();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={buttonClass(variant, size, className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** A small self-contained form that runs one action (e.g. delete) and shows errors inline. */
export function InlineAction({
  action,
  children,
  className,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const readOnly = useReadOnly();
  if (readOnly) return null; // delete / deactivate / approve etc. are hidden for the observer
  return (
    <form action={formAction} className={cn("inline-flex flex-col items-end", className)}>
      {children}
      {state.status === "error" && state.message && <p className="mt-1 max-w-56 text-right text-xs text-rose-ink">{state.message}</p>}
    </form>
  );
}

/** Button that opens a dialog. Forms inside close the dialog on success. */
export function Modal({
  trigger,
  title,
  description,
  children,
  triggerVariant = "primary",
  triggerSize = "md",
  wide = false,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  triggerVariant?: "primary" | "secondary" | "danger" | "soft" | "ghost";
  triggerSize?: "sm" | "md" | "lg";
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const readOnly = useReadOnly();

  const close = () => {
    ref.current?.close();
  };

  // Every modal in the app is a create/edit form, so the observer doesn't get the trigger.
  if (readOnly) return null;

  return (
    <>
      <button
        type="button"
        className={buttonClass(triggerVariant, triggerSize)}
        onClick={() => {
          setKey((k) => k + 1); // fresh form state each time it opens
          setOpen(true);
          ref.current?.showModal();
        }}
      >
        {trigger}
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className={cn(
          "m-auto w-[calc(100%-2rem)] rounded-[var(--radius-card)] border border-line bg-surface p-0 text-ink shadow-xl",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          <button type="button" onClick={close} className="rounded-full p-1.5 text-muted hover:bg-beige-100" aria-label="Tutup">
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {open && (
            <ModalContext value={{ close }} key={key}>
              {children}
            </ModalContext>
          )}
        </div>
      </dialog>
    </>
  );
}
