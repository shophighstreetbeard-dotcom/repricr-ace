import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-takealot-signature',
};

interface WebhookPayload {
  event_type: string;
  offer_id?: string;
  sku?: string;
  price?: number;
  stock?: number;
  buy_box_winner?: boolean;
  buy_box_status?: string;
  timestamp?: string;
}

// Fixed user ID for private use
const PRIVATE_USER_ID = '00000000-0000-0000-0000-000000000001';

async function verifySignature(body: string, signature: string | null, secret: string | null): Promise<boolean> {
  if (!secret || !signature) {
    console.log('No signature verification configured');
    return true;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === computedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('TAKEALOT_WEBHOOK_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get('x-takealot-signature');

    console.log('Received webhook:', body.substring(0, 500));

    // Verify signature if secret is configured
    if (webhookSecret) {
      const isValid = await verifySignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload: WebhookPayload = JSON.parse(body);
    console.log('Parsed webhook payload:', payload);

    // Store the webhook event
    await supabase.from('webhook_events').insert({
      user_id: PRIVATE_USER_ID,
      event_type: payload.event_type || 'unknown',
      payload: payload,
      processed: false,
    });

    // Find the product
    let product = null;
    if (payload.offer_id) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('takealot_offer_id', payload.offer_id)
        .eq('user_id', PRIVATE_USER_ID)
        .single();
      product = data;
    } else if (payload.sku) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('sku', payload.sku)
        .eq('user_id', PRIVATE_USER_ID)
        .single();
      product = data;
    }

    if (!product) {
      console.log('Product not found for webhook');
      return new Response(
        JSON.stringify({ success: true, message: 'Product not found, event logged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update product based on webhook data
    const updates: Record<string, any> = {
      last_synced_at: new Date().toISOString(),
    };

    if (payload.price !== undefined && payload.price !== product.current_price) {
      await supabase.from('price_history').insert({
        product_id: product.id,
        old_price: product.current_price,
        new_price: payload.price,
        reason: 'Takealot webhook update',
      });
      updates.current_price = payload.price;
    }

    if (payload.stock !== undefined) {
      updates.stock_quantity = payload.stock;
    }

    if (payload.buy_box_winner !== undefined) {
      updates.buy_box_status = payload.buy_box_winner ? 'won' : 'lost';
    } else if (payload.buy_box_status !== undefined) {
      updates.buy_box_status = payload.buy_box_status;
    }

    if (Object.keys(updates).length > 1) {
      await supabase
        .from('products')
        .update(updates)
        .eq('id', product.id);
      
      console.log(`Updated product ${product.sku}:`, updates);
    }

    // Mark webhook as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('payload->offer_id', payload.offer_id);

    return new Response(
      JSON.stringify({ success: true, updated: product.sku }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
