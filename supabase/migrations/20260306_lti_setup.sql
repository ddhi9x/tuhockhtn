
-- Table to store Canvas LTI 1.3 Registrations (Client ID, Deployment ID, URLs)
CREATE TABLE IF NOT EXISTS public.lti_registrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    platform_issuer TEXT NOT NULL, -- e.g. https://canvas.instructure.com or https://4015.instructure.com
    client_id TEXT NOT NULL,
    deployment_id TEXT,
    platform_oidc_url TEXT NOT NULL,
    platform_jwks_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(platform_issuer, client_id)
);

-- Table to store temporary OIDC states for CSRF protection and multi-step flow
CREATE TABLE IF NOT EXISTS public.lti_states (
    state TEXT PRIMARY KEY,
    nonce TEXT NOT NULL,
    target_link_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS (though for now we might keep it simple for the Edge Function)
ALTER TABLE public.lti_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_states ENABLE ROW LEVEL SECURITY;

-- Migration to allow Edge Function and Admin accessibility
CREATE POLICY "Admin can manage LTI registrations" ON public.lti_registrations FOR ALL USING (true);
CREATE POLICY "Anyone can manage LTI states" ON public.lti_states FOR ALL USING (true);

-- Store for RSA Key Pair (Private/Public) for the Tool
-- Note: In a production env, Private Key should ideally be in Supabase Vault or Secrets
CREATE TABLE IF NOT EXISTS public.lti_keys (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key_id TEXT NOT NULL UNIQUE, -- kid for JWK
    private_key_pem TEXT NOT NULL, -- PEM format
    public_key_pem TEXT NOT NULL,  -- PEM format
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.lti_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage LTI keys" ON public.lti_keys FOR ALL USING (true);
