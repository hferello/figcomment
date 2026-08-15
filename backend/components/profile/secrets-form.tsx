"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode, type SubmitEvent } from "react";
import { saveUserSecretsAction } from "@/app/actions/secrets";
import { FigmaTokenGuideDialog } from "@/components/profile/figma-token-guide-dialog";
import { PasswordField } from "@/components/shared/password-field";
import {
  StatusAlert,
  type StatusNotice,
} from "@/components/shared/status-alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type { LlmProvider } from "@/lib/user-secrets/service";
import type { SecretStatus } from "@/lib/user-secrets/service";

/** Fake filled value so a saved field looks occupied without exposing the real secret. */
const MASKED_SECRET_DISPLAY = "xxxxxxxxxxxxxxxxxxxxxxxx";

type SecretsFormProps = {
  initial_status: SecretStatus;
  is_email_confirmed: boolean;
};

type SecretCredentialFieldProps = {
  id: string;
  name: string;
  label: string;
  is_saved: boolean;
  is_locked: boolean;
  value: string;
  empty_placeholder: string;
  saved_placeholder: string;
  description: string;
  locked_description: string;
  disabled?: boolean;
  label_action?: ReactNode;
  onValueChange: (value: string) => void;
};

function SecretCredentialField({
  id,
  name,
  label,
  is_saved,
  is_locked,
  value,
  empty_placeholder,
  saved_placeholder,
  description,
  locked_description,
  disabled = false,
  label_action,
  onValueChange,
}: SecretCredentialFieldProps) {
  return (
    <Field>
      <div className="flex items-baseline justify-between gap-fc-12">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-fc-12 gap-y-fc-6">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {label_action}
        </div>
        <span className="shrink-0 text-fc-12 font-medium">
          {is_saved ? "Saved" : "Not saved"}
        </span>
      </div>
      <PasswordField
        id={id}
        name={is_locked ? undefined : name}
        value={is_locked ? MASKED_SECRET_DISPLAY : value}
        disabled={disabled || is_locked}
        onChange={(event) => onValueChange(event.target.value)}
        autoComplete="off"
        placeholder={is_saved ? saved_placeholder : empty_placeholder}
        readOnly={is_locked}
      />
      <FieldDescription>
        {is_locked ? locked_description : description}
      </FieldDescription>
    </Field>
  );
}

/**
 * Interactive credential editor. Existing plaintext never crosses the server boundary.
 */
export function SecretsForm({
  initial_status,
  is_email_confirmed,
}: SecretsFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initial_status);
  const [figma_token, setFigmaToken] = useState("");
  const [llm_key, setLlmKey] = useState("");
  const [llm_provider, setLlmProvider] = useState<LlmProvider>(
    initial_status.llm_provider ?? "anthropic",
  );
  const [is_replacing, setIsReplacing] = useState(false);
  const [notice, setNotice] = useState<StatusNotice | null>(null);
  const [is_pending, startTransition] = useTransition();

  // Only both-saved locks the form behind Replace; one saved still allows saving the other.
  const show_replace_action =
    status.figma_saved && status.llm_saved && !is_replacing;

  function handleReplaceTokens() {
    setNotice(null);
    setFigmaToken("");
    setLlmKey("");
    setIsReplacing(true);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const trimmed_figma_token = figma_token.trim();
    const trimmed_llm_key = llm_key.trim();
    if (!trimmed_figma_token && !trimmed_llm_key) {
      setNotice({ kind: "error", message: "Enter at least one credential to save." });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveUserSecretsAction({
          ...(trimmed_figma_token ? { figma_token: trimmed_figma_token } : {}),
          ...(trimmed_llm_key
            ? {
                llm_key: trimmed_llm_key,
                llm_provider,
              }
            : {}),
        });

        if (!result.ok) {
          console.error("[SecretsForm] save_failed", result.code);
          setNotice({ kind: "error", message: result.message });
          return;
        }

        setStatus(result.data);
        setFigmaToken("");
        setLlmKey("");
        if (result.data.llm_provider) {
          setLlmProvider(result.data.llm_provider);
        }
        setIsReplacing(false);
        setNotice({
          kind: "success",
          message: "Credentials saved and encrypted. Their values will not be shown again.",
        });
        // Re-render PluginTokenControls so Create unlocks when both secrets are saved.
        router.refresh();
      } catch (error) {
        console.error("[SecretsForm] unexpected_error", error);
        setNotice({ kind: "error", message: "Could not save credentials. Please try again." });
      }
    });
  }

  // Disable inputs/submit only — keep the Figma guide link usable inside the fieldset.
  const are_fields_disabled = !is_email_confirmed || is_pending;

  return (
    <form onSubmit={handleSubmit} className="rounded-fc-24 bg-fc-bg p-fc-24">
      <FieldSet>
        <FieldLegend>Encrypted credentials</FieldLegend>
        <StatusAlert
          notice={notice}
          error_title="Could not save"
          success_title="Saved"
        />

        <FieldGroup>
          <SecretCredentialField
            id="figma-token"
            name="figma_token"
            label="Figma personal access token"
            is_saved={status.figma_saved}
            is_locked={status.figma_saved && !is_replacing}
            value={figma_token}
            empty_placeholder="figd_…"
            saved_placeholder="Enter a replacement token"
            description="Omit this field to keep the currently saved Figma token."
            locked_description="Saved securely. Click Replace tokens to enter a new value."
            disabled={are_fields_disabled}
            label_action={<FigmaTokenGuideDialog />}
            onValueChange={setFigmaToken}
          />
          <Field>
            <FieldLabel htmlFor="llm-provider">AI provider (optional)</FieldLabel>
            <select
              id="llm-provider"
              value={llm_provider}
              className="h-fc-48 w-full rounded-fc-12 border border-input bg-background px-fc-12 text-fc-14"
              disabled={are_fields_disabled || (status.llm_saved && !is_replacing)}
              onChange={(event) => setLlmProvider(event.target.value as LlmProvider)}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
            <FieldDescription>
              Choose where AI requests go when you use AI sort in the plugin.
            </FieldDescription>
          </Field>
          <SecretCredentialField
            id="llm-key"
            name="llm_key"
            label="Model API key (optional)"
            is_saved={status.llm_saved}
            is_locked={status.llm_saved && !is_replacing}
            value={llm_key}
            empty_placeholder="Paste provider key"
            saved_placeholder="Enter a replacement key"
            description="Omit this field to keep the currently saved model key."
            locked_description="Saved securely. Click Replace tokens to enter a new value."
            disabled={are_fields_disabled}
            onValueChange={setLlmKey}
          />
        </FieldGroup>

        {show_replace_action ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={are_fields_disabled}
            onClick={handleReplaceTokens}
          >
            Replace tokens
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={are_fields_disabled}
          >
            {is_pending ? "Encrypting…" : "Save credentials"}
          </Button>
        )}
      </FieldSet>
    </form>
  );
}
