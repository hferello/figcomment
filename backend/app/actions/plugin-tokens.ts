"use server";

/**
 * Server actions: plugin token mint, rotate, and revoke mutations.
 * Context: full token shown once at mint/rotate; hash stored via service_role only.
 */

import {
  actionErr,
  actionOk,
  type ActionResult,
} from "@/lib/auth/action-error";
import {
  requireEmailConfirmedUser,
} from "@/lib/auth/require-session";
import {
  mintPluginToken,
  revokeActivePluginToken,
  rotatePluginToken,
  type MintPluginTokenResult,
} from "@/lib/plugin-tokens/service";

export async function mintPluginTokenAction(): Promise<
  ActionResult<MintPluginTokenResult>
> {
  console.log("[mintPluginTokenAction] started");

  try {
    // Step 1: email confirmed; secrets + one-active-token rules live in the service.
    const user = await requireEmailConfirmedUser();

    // Step 2: generate fc_… token, store hash, return full token once.
    const result = await mintPluginToken(user.id);

    console.log("[mintPluginTokenAction] completed", { user_id: user.id });
    return actionOk(result);
  } catch (error) {
    console.error("[mintPluginTokenAction] failed", error);
    return actionErr(error);
  }
}

export async function rotatePluginTokenAction(): Promise<
  ActionResult<MintPluginTokenResult>
> {
  console.log("[rotatePluginTokenAction] started");

  try {
    // Step 1: confirmed user required — same gate as mint.
    const user = await requireEmailConfirmedUser();

    // Step 2: revoke current row, insert new hash, return new full token once.
    const result = await rotatePluginToken(user.id);

    console.log("[rotatePluginTokenAction] completed", { user_id: user.id });
    return actionOk(result);
  } catch (error) {
    console.error("[rotatePluginTokenAction] failed", error);
    return actionErr(error);
  }
}

export async function revokePluginTokenAction(): Promise<ActionResult<{ revoked: true }>> {
  console.log("[revokePluginTokenAction] started");

  try {
    // Step 1: confirmed user — revoke is a privileged lifecycle write.
    const user = await requireEmailConfirmedUser();

    // Step 2: set revoked_at via service_role; plugin classify will 401 afterward.
    await revokeActivePluginToken(user.id);

    console.log("[revokePluginTokenAction] completed", { user_id: user.id });
    return actionOk({ revoked: true });
  } catch (error) {
    console.error("[revokePluginTokenAction] failed", error);
    return actionErr(error);
  }
}
