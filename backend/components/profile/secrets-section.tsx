import { SecretsForm } from "@/components/profile/secrets-form";
import { ProfileFeaturePanel } from "@/components/shared/profile-feature-panel";
import type { SecretStatus } from "@/lib/user-secrets/service";

type SecretsSectionProps = {
  initial_status: SecretStatus;
  is_email_confirmed: boolean;
};

/**
 * Server-rendered panel chrome around the focused credential editor island.
 */
export function SecretsSection({
  initial_status,
  is_email_confirmed,
}: SecretsSectionProps) {
  return (
    <ProfileFeaturePanel
      tone="blue"
      eyebrow="Provider credentials"
      title="Bring your own keys."
      description="Figcomment encrypts these credentials before storing them. Saved values are never sent back to your browser."
      illustration={{
        src: "/illustrations/keys.svg",
        alt: "Placeholder illustration of a key",
        caption: "Illustration placeholder: provider keys",
      }}
    >
      <SecretsForm
        initial_status={initial_status}
        is_email_confirmed={is_email_confirmed}
      />
    </ProfileFeaturePanel>
  );
}
