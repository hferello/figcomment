import { PluginTokenControls } from "@/components/profile/plugin-token-controls";
import { ProfileFeaturePanel } from "@/components/shared/profile-feature-panel";
import type { PluginTokenMetadata } from "@/lib/plugin-tokens/service";
import type { SecretStatus } from "@/lib/user-secrets/service";

type PluginTokenSectionProps = {
  initial_metadata: PluginTokenMetadata | null;
  secret_status: SecretStatus;
  is_email_confirmed: boolean;
};

/**
 * Server-rendered panel chrome around the focused token lifecycle island.
 */
export function PluginTokenSection({
  initial_metadata,
  secret_status,
  is_email_confirmed,
}: PluginTokenSectionProps) {
  return (
    <ProfileFeaturePanel
      tone="mint"
      eyebrow="Plugin access"
      title="One token. Easy to replace."
      description="Paste this token into the Figcomment plugin. Only a secure hash is stored on the server."
      illustration={{
        src: "/illustrations/token.svg",
        alt: "Person holding a token",
      }}
    >
      <PluginTokenControls
        initial_metadata={initial_metadata}
        secret_status={secret_status}
        is_email_confirmed={is_email_confirmed}
      />
    </ProfileFeaturePanel>
  );
}
