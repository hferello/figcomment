"use client";

import { useState, useTransition, type SubmitEvent } from "react";
import { saveUserSecretsAction } from "@/app/actions/secrets";
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
import type { SecretStatus } from "@/lib/user-secrets/service";

type SecretsFormProps = {
  initial_status: SecretStatus;
  is_email_confirmed: boolean;
};

type SecretCredentialFieldProps = {
  id: string;
  name: string;
  label: string;
  is_saved: boolean;
  value: string;
  empty_placeholder: string;
  saved_placeholder: string;
  description: string;
  onValueChange: (value: string) => void;
};

function SecretCredentialField({
  id,
  name,
  label,
  is_saved,
  value,
  empty_placeholder,
  saved_placeholder,
  description,
  onValueChange,
}: SecretCredentialFieldProps) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-fc-12">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="text-fc-12 font-medium">
          {is_saved ? "Saved" : "Not saved"}
        </span>
      </div>
      <PasswordField
        id={id}
        name={name}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        autoComplete="off"
        placeholder={is_saved ? saved_placeholder : empty_placeholder}
      />
      <FieldDescription>{description}</FieldDescription>
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
  const [status, setStatus] = useState(initial_status);
  const [figma_token, setFigmaToken] = useState("");
  const [anthropic_key, setAnthropicKey] = useState("");
  const [notice, setNotice] = useState<StatusNotice | null>(null);
  const [is_pending, startTransition] = useTransition();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const trimmed_figma_token = figma_token.trim();
    const trimmed_anthropic_key = anthropic_key.trim();
    if (!trimmed_figma_token && !trimmed_anthropic_key) {
      setNotice({ kind: "error", message: "Enter at least one credential to save." });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveUserSecretsAction({
          ...(trimmed_figma_token ? { figma_token: trimmed_figma_token } : {}),
          ...(trimmed_anthropic_key ? { anthropic_key: trimmed_anthropic_key } : {}),
        });

        if (!result.ok) {
          console.error("[SecretsForm] save_failed", result.code);
          setNotice({ kind: "error", message: result.message });
          return;
        }

        setStatus(result.data);
        setFigmaToken("");
        setAnthropicKey("");
        setNotice({
          kind: "success",
          message: "Credentials saved and encrypted. Their values will not be shown again.",
        });
      } catch (error) {
        console.error("[SecretsForm] unexpected_error", error);
        setNotice({ kind: "error", message: "Could not save credentials. Please try again." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-fc-24 bg-fc-bg p-fc-24">
      <FieldSet disabled={!is_email_confirmed || is_pending}>
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
            value={figma_token}
            empty_placeholder="figd_…"
            saved_placeholder="Enter a replacement token"
            description="Omit this field to keep the currently saved Figma token."
            onValueChange={setFigmaToken}
          />
          <SecretCredentialField
            id="anthropic-key"
            name="anthropic_key"
            label="Anthropic API key"
            is_saved={status.anthropic_saved}
            value={anthropic_key}
            empty_placeholder="sk-ant-…"
            saved_placeholder="Enter a replacement key"
            description="Omit this field to keep the currently saved Anthropic key."
            onValueChange={setAnthropicKey}
          />
        </FieldGroup>

        <Button type="submit" size="lg" className="w-full">
          {is_pending ? "Encrypting…" : "Save credentials"}
        </Button>
      </FieldSet>
    </form>
  );
}
