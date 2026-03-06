
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const url = new URL(req.url);
        const params = url.searchParams;
        const iss = params.get("iss");
        const login_hint = params.get("login_hint");
        const target_link_uri = params.get("target_link_uri");
        const lti_message_hint = params.get("lti_message_hint");

        if (!iss || !login_hint) {
            return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Find the registration
        const { data: registration, error: regError } = await supabase
            .from("lti_registrations")
            .select("*")
            .eq("platform_issuer", iss)
            .maybeSingle();

        if (!registration) {
            console.error("LTI Registration not found for issuer:", iss);
            return new Response("Unauthorized Issuer", { status: 401 });
        }

        // 2. Generate State and Nonce
        const state = crypto.randomUUID();
        const nonce = crypto.randomUUID();

        // 3. Store state for verification in launch
        await supabase.from("lti_states").insert({
            state,
            nonce,
            target_link_uri: target_link_uri || "https://tuhockhtn.vercel.app/"
        });

        // 4. Construct OIDC Redirect URL
        const authUrl = new URL(registration.platform_oidc_url);
        authUrl.searchParams.set("scope", "openid");
        authUrl.searchParams.set("response_type", "id_token");
        authUrl.searchParams.set("client_id", registration.client_id);
        authUrl.searchParams.set("redirect_uri", "https://lqusmaooekvbflhmwlty.functions.supabase.co/lti-launch");
        authUrl.searchParams.set("login_hint", login_hint);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("nonce", nonce);
        authUrl.searchParams.set("response_mode", "form_post");
        authUrl.searchParams.set("prompt", "none");
        if (lti_message_hint) authUrl.searchParams.set("lti_message_hint", lti_message_hint);

        return Response.redirect(authUrl.toString(), 302);

    } catch (err) {
        console.error("LTI Login Error:", err);
        return new Response(err.message, { status: 500 });
    }
});
