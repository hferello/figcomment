import { PluginTokenControls } from "@/components/profile/plugin-token-controls";
import { ProfileFeaturePanel } from "@/components/shared/profile-feature-panel";
import type { PluginTokenMetadata } from "@/lib/plugin-tokens/service";

type PluginTokenSectionProps = {
  initial_metadata: PluginTokenMetadata | null;
  is_email_confirmed: boolean;
};

/**
 * Server-rendered panel chrome around the focused token lifecycle island.
 */
export function PluginTokenSection({
  initial_metadata,
  is_email_confirmed,
}: PluginTokenSectionProps) {
  return (
    <ProfileFeaturePanel
      tone="peach"
      eyebrow="Plugin access"
      title="One token. Easy to replace."
      description="Paste this token into the Figcomment plugin. Only a secure hash is stored on the server."
      illustration={{
        src: "/illustrations/token.svg",
        alt: "Placeholder illustration of an access token",
        caption: "Illustration placeholder: plugin token",
      }}
    >
      <PluginTokenControls
        initial_metadata={initial_metadata}
        is_email_confirmed={is_email_confirmed}
      />
    </ProfileFeaturePanel>
  );
}
