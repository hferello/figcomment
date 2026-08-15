-- Add provider metadata for optional AI credentials.
alter table public.user_secrets
  add column if not exists llm_provider text;

update public.user_secrets
set llm_provider = 'anthropic'
where llm_provider is null
  and anthropic_ciphertext is not null
  and anthropic_nonce is not null;

alter table public.user_secrets
  drop constraint if exists user_secrets_llm_provider_chk;

alter table public.user_secrets
  add constraint user_secrets_llm_provider_chk check (
    llm_provider is null or llm_provider in ('openai', 'gemini', 'anthropic')
  );

alter table public.user_secrets
  drop constraint if exists user_secrets_llm_pair_chk;

alter table public.user_secrets
  add constraint user_secrets_llm_pair_chk check (
    (anthropic_ciphertext is null and anthropic_nonce is null and llm_provider is null)
    or (anthropic_ciphertext is not null and anthropic_nonce is not null and llm_provider is not null)
  );
