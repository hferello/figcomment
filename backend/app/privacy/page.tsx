import { PageFrame } from "@/components/shared/page-frame";
import { app_constants } from "@/data/constants";

export default function PrivacyPage() {
  return (
    <PageFrame>
      <section className="mx-auto max-w-3xl rounded-fc-24 bg-fc-bg p-fc-24 md:p-fc-36">
        <h1 className="font-display text-fc-48 font-bold leading-none">
          {app_constants.backend.title} privacy
        </h1>
        <p className="mt-fc-18 text-fc-16 text-muted-foreground">
          {app_constants.backend.title} processes Figma comments to return grouped output in your plugin session. We do not persist full comment payloads in our database.
        </p>

        <h2 className="mt-fc-30 text-fc-24 font-semibold">What we store</h2>
        <ul className="mt-fc-12 list-disc pl-fc-24 text-fc-16">
          <li>Your encrypted Figma PAT.</li>
          <li>Your encrypted optional model API key and selected provider.</li>
          <li>Plugin token hash, prefix, and lifecycle metadata.</li>
        </ul>

        <h2 className="mt-fc-30 text-fc-24 font-semibold">
          How comment data is processed
        </h2>
        <ul className="mt-fc-12 list-disc pl-fc-24 text-fc-16">
          <li>
            Keyword mode: comments are processed by {app_constants.backend.title} only; no model
            provider receives comment content.
          </li>
          <li>
            AI mode: comments are redacted before provider calls. Email
            addresses, phone numbers, URLs, and author names are tokenized
            first.
          </li>
          <li>
            We cap and truncate comments per request to reduce over-sharing and
            improve reliability.
          </li>
        </ul>

        <h2 className="mt-fc-30 text-fc-24 font-semibold">Billing and logs</h2>
        <ul className="mt-fc-12 list-disc pl-fc-24 text-fc-16">
          <li>
            Provider usage is billed directly to your own OpenAI, Gemini, or
            Anthropic account.
          </li>
          <li>
            Operational logs are retained according to the active Vercel plan.
          </li>
        </ul>

        <h2 className="mt-fc-30 text-fc-24 font-semibold">Deletion and support</h2>
        <p className="mt-fc-12 text-fc-16">
          You can delete your account from the profile page. This deletes your
          profile row, encrypted secrets, and plugin token rows via database
          cascade. For support, use{" "}
          <a
            className="underline underline-offset-4"
            href="https://github.com/hferello/figcomment/issues"
            target="_blank"
            rel="noreferrer"
          >
            GitHub Issues
          </a>
          .
        </p>
      </section>
    </PageFrame>
  );
}
