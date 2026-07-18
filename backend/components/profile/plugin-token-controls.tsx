"use client";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useState, useTransition } from "react";
import {
  mintPluginTokenAction,
  revokePluginTokenAction,
  rotatePluginTokenAction,
} from "@/app/actions/plugin-tokens";
import { TokenConfirmation } from "@/components/profile/token-confirmation";
import { CopyableValue } from "@/components/shared/copyable-value";
import {
  StatusAlert,
  type StatusNotice,
} from "@/components/shared/status-alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PluginTokenMetadata } from "@/lib/plugin-tokens/service";
import type { SecretStatus } from "@/lib/user-secrets/service";

dayjs.extend(utc);

type PluginTokenControlsProps = {
  initial_metadata: PluginTokenMetadata | null;
  secret_status: SecretStatus;
  is_email_confirmed: boolean;
};

type Confirmation = "rotate" | "revoke" | null;

function formatDate(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = dayjs.utc(value);
  if (!date.isValid()) {
    return "Unknown";
  }

  return date.format("D MMM YYYY, HH:mm [UTC]");
}

/**
 * Owns plugin-token lifecycle state; static panel content remains server-rendered.
 */
export function PluginTokenControls({
  initial_metadata,
  secret_status,
  is_email_confirmed,
}: PluginTokenControlsProps) {
  const [metadata, setMetadata] = useState(initial_metadata);
  const [token_once, setTokenOnce] = useState<string | null>(null);
  const [notice, setNotice] = useState<StatusNotice | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [is_pending, startTransition] = useTransition();

  // Prop (not state) so a secrets save + router.refresh() re-enables Create immediately.
  const are_secrets_ready =
    secret_status.figma_saved && secret_status.anthropic_saved;
  const can_create_token =
    is_email_confirmed && are_secrets_ready && !is_pending;

  function handleMint() {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await mintPluginTokenAction();
        if (!result.ok) {
          console.error("[PluginTokenControls] mint_failed", result.code);
          setNotice({ kind: "error", message: result.message });
          return;
        }

        setMetadata(result.data.metadata);
        setTokenOnce(result.data.token);
        setNotice({
          kind: "success",
          message: "Token created. Copy it now; it will not be shown again.",
        });
      } catch (error) {
        console.error("[PluginTokenControls] mint_unexpected_error", error);
        setNotice({
          kind: "error",
          message: "Could not create a token. Please try again.",
        });
      }
    });
  }

  function handleRotate() {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await rotatePluginTokenAction();
        if (!result.ok) {
          console.error("[PluginTokenControls] rotate_failed", result.code);
          setNotice({ kind: "error", message: result.message });
          return;
        }

        setMetadata(result.data.metadata);
        setTokenOnce(result.data.token);
        setConfirmation(null);
        setNotice({
          kind: "success",
          message: "Token rotated. Replace the old token in your plugin now.",
        });
      } catch (error) {
        console.error("[PluginTokenControls] rotate_unexpected_error", error);
        setNotice({
          kind: "error",
          message: "Could not rotate the token. Please try again.",
        });
      }
    });
  }

  function handleRevoke() {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await revokePluginTokenAction();
        if (!result.ok) {
          console.error("[PluginTokenControls] revoke_failed", result.code);
          setNotice({ kind: "error", message: result.message });
          return;
        }

        setMetadata(null);
        setTokenOnce(null);
        setConfirmation(null);
        setNotice({
          kind: "success",
          message: "Token revoked. The plugin can no longer call Figcomment.",
        });
      } catch (error) {
        console.error("[PluginTokenControls] revoke_unexpected_error", error);
        setNotice({
          kind: "error",
          message: "Could not revoke the token. Please try again.",
        });
      }
    });
  }

  return (
    <div className="rounded-fc-24 bg-fc-bg p-fc-24">
      <h3 className="font-display text-fc-24 font-bold">Plugin token</h3>

      <StatusAlert
        notice={notice}
        error_title="Action failed"
        success_title="Updated"
        className="mt-fc-18"
      />

      {token_once ? (
        <CopyableValue
          value={token_once}
          label="Copy once"
          button_label="Copy token"
          error_message="Clipboard access failed. Select and copy the token manually."
          className="mt-fc-18"
        />
      ) : null}

      <Separator className="my-fc-24" />

      {metadata ? (
        <div>
          <dl className="grid gap-fc-18 text-fc-14">
            <div>
              <dt className="text-muted-foreground">Prefix</dt>
              <dd className="mt-fc-12 font-mono font-medium">
                {metadata.prefix}…
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-fc-12">{formatDate(metadata.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last used</dt>
              <dd className="mt-fc-12">{formatDate(metadata.last_used_at)}</dd>
            </div>
          </dl>

          {confirmation ? (
            <TokenConfirmation
              action={confirmation}
              is_pending={is_pending}
              onConfirm={
                confirmation === "rotate" ? handleRotate : handleRevoke
              }
              onCancel={() => setConfirmation(null)}
            />
          ) : (
            <div className="mt-fc-24 flex flex-wrap gap-fc-12">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={!is_email_confirmed || is_pending}
                onClick={() => setConfirmation("rotate")}
              >
                Rotate
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={!is_email_confirmed || is_pending}
                onClick={() => setConfirmation("revoke")}
              >
                Revoke
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-fc-18">No active token yet.</p>
          <p className="mt-fc-12 text-fc-14 text-muted-foreground">
            {are_secrets_ready
              ? "Create one when you are ready to connect the plugin."
              : "Save both your Figma token and Anthropic key above before creating a plugin token."}
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-fc-24 w-full"
            disabled={!can_create_token}
            onClick={handleMint}
          >
            {is_pending ? "Creating…" : "Create plugin token"}
          </Button>
        </div>
      )}
    </div>
  );
}
