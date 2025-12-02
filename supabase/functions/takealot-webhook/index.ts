import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event_type: string;
  offer_id?: string;
  sku?: string;
  price?: number;
  stock?: number;
  buy_box_status?: string;
  timestamp: string;
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

    // Verify webhook signature
    const signature = req.headers.get('x-takealot-signature');
    if (webhookSecret && signature) {
      const body = await req.text();
      const encoder = new TextEncoder();
      const data = encoder.encode(body);
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );
      const expectedSignature = await crypto.subtle.sign('HMAC', key, data);
      const expectedHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== expectedHex) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Parse the already-read body
      const payload: WebhookPayload = JSON.parse(body);
      await processWebhook(supabase, payload);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No signature verification
    const payload: WebhookPayload = await req.json();
    await processWebhook(supabase, payload);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processWebhook(supabase: any, payload: WebhookPayload) {
  console.log('Processing webhook:', payload);

  // Find product by offer_id or SKU
  let productQuery = supabase.from('products').select('*');
  
  if (payload.offer_id) {
    productQuery = productQuery.eq('takealot_offer_id', payload.offer_id);
  } else if (payload.sku) {
    productQuery = productQuery.eq('sku', payload.sku);
  } else {
    throw new Error('No offer_id or SKU provided');
  }

  const { data: products, error: fetchError } = await productQuery;
  
  if (fetchError) throw fetchError;
  if (!products || products.length === 0) {
    console.log('Product not found for webhook');
    return;
  }

  const product = products[0];

  // Log webhook event
  await supabase.from('webhook_events').insert({
    user_id: product.user_id,
    event_type: payload.event_type,
    payload: payload,
    processed: true,
  });

  // Update product based on event type
  const updates: any = {
    last_synced_at: new Date().toISOString(),
  };

  if (payload.price !== undefined) {
    // Log price change
    if (product.current_price !== payload.price) {
      await supabase.from('price_history').insert({
        product_id: product.id,
        old_price: product.current_price,
        new_price: payload.price,
        reason: `Takealot webhook: ${payload.event_type}`,
      });
    }
    updates.current_price = payload.price;
  }

  if (payload.stock !== undefined) {
    updates.stock_quantity = payload.stock;
  }

  if (payload.buy_box_status !== undefined) {
    updates.buy_box_status = payload.buy_box_status;
  }

  await supabase.from('products').update(updates).eq('id', product.id);
  
  console.log('Product updated successfully');
}
