
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
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Fetch active keys
        let { data: keys, error } = await supabase
            .from("lti_keys")
            .select("key_id, public_key_pem")
            .eq("is_active", true);

        if (error) throw error;

        // 2. Lazy Initialization: If no keys exist, generate one
        if (!keys || keys.length === 0) {
            console.log("No LTI keys found. Generating new RSA Key Pair...");

            const { publicKey, privateKey } = await crypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: "SHA-256",
                },
                true,
                ["sign", "verify"],
            );

            const publicKeyPem = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("spki", publicKey))));
            const privateKeyPem = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("pkcs8", privateKey))));
            const kid = crypto.randomUUID();

            await supabase.from("lti_keys").insert({
                key_id: kid,
                private_key_pem: privateKeyPem,
                public_key_pem: publicKeyPem,
            });

            keys = [{ key_id: kid, public_key_pem: publicKeyPem }];
        }

        // 3. Convert PEM to JWK
        const jwks = await Promise.all(keys.map(async (k) => {
            const pemContent = atob(k.public_key_pem);
            const binary = new Uint8Array(pemContent.length);
            for (let i = 0; i < pemContent.length; i++) binary[i] = pemContent.charCodeAt(i);

            const key = await crypto.subtle.importKey(
                "spki",
                binary,
                { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                true,
                ["verify"]
            );

            const jwk = await crypto.subtle.exportKey("jwk", key);
            return {
                ...jwk,
                kid: k.key_id,
                use: "sig",
                alg: "RS256"
            };
        }));

        return new Response(JSON.stringify({ keys: jwks }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("LTI Keys Error:", err);
        return new Response(err.message, { status: 500 });
    }
});
