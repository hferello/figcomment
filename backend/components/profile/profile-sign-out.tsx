import { SignOutButton } from "@/components/profile/sign-out-button";
import { createClient } from "@/lib/supabase/server";

/**
 * Server island: resolve the signed-in email for the header sign-out control.
 */
export async function ProfileSignOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SignOutButton email={user?.email ?? null} />;
}
