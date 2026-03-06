
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const formData = await req.formData();
        const idToken = formData.get("id_token") as string;
        const state = formData.get("state") as string;

        if (!idToken || !state) {
            return new Response("Missing id_token or state", { status: 400 });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Verify State and Nonce
        const { data: stateData, error: stateError } = await supabase
            .from("lti_states")
            .select("*")
            .eq("state", state)
            .maybeSingle();

        if (!stateData || stateError) {
            console.error("Invalid state or expired session");
            return new Response("Invalid state", { status: 403 });
        }

        // Single use state
        await supabase.from("lti_states").delete().eq("state", state);

        // 2. Decode JWT (unverified first to get issuer)
        const payload = jose.decodeJwt(idToken);
        const iss = payload.iss as string;

        // 3. Lookup Registration
        const { data: registration, error: regError } = await supabase
            .from("lti_registrations")
            .select("*")
            .eq("platform_issuer", iss)
            .maybeSingle();

        if (!registration) {
            return new Response("Platform not registered", { status: 401 });
        }

        // 4. Verify ID Token Signature using Platform's JWKS
        // Note: In real world, we should cache the JWKS
        const JWKS = jose.createRemoteJWKSet(new URL(registration.platform_jwks_url));
        const { payload: verifiedPayload } = await jose.jwtVerify(idToken, JWKS, {
            audience: registration.client_id,
            issuer: iss,
        });

        // 5. Verify Nonce
        if (verifiedPayload.nonce !== stateData.nonce) {
            return new Response("Invalid nonce", { status: 403 });
        }

        // 6. Handle User Identity
        const email = verifiedPayload.email as string;
        const name = verifiedPayload.name as string;
        const canvasUserId = verifiedPayload.sub as string;

        console.log(`LTI Launch successful for user: ${email} (${canvasUserId})`);

        // 7. Find or Create User in Supabase
        let user;
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: {
                full_name: name,
                canvas_user_id: canvasUserId,
                source: 'canvas_lti'
            }
        });

        if (createError) {
            if (createError.message.includes("already registered") || createError.status === 422) {
                // User exists, fetch them
                const { data: listData } = await supabase.auth.admin.listUsers({
                    filters: { email: email }
                });
                user = listData?.users[0];
            } else {
                throw createError;
            }
        } else {
            user = newUser.user;
        }

        if (!user) throw new Error("Could not identify or create user");


        // 8. Generate a temporary login link or session
        // Since we can't easily set a cookie from here for vercel.app,
        // we'll redirect to a callback page that handles the login.
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email!,
            options: { redirectTo: stateData.target_link_uri }
        });

        if (linkError) throw linkError;

        // Redirect to the Magic Link which will then redirect to the app
        return Response.redirect(linkData.properties.action_link, 302);

    } catch (err) {
        console.error("LTI Launch Error:", err);
        return new Response(`Authentication Error: ${err.message}`, { status: 500 });
    }
});
