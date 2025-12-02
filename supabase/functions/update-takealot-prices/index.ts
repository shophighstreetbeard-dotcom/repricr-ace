import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceUpdate {
  product_id: string;
  new_price: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const takealotApiKey = Deno.env.get('TAKEALOT_API_KEY');

    if (!takealotApiKey) {
      throw new Error('TAKEALOT_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { updates }: { updates: PriceUpdate[] } = await req.json();

    if (!updates || updates.length === 0) {
      throw new Error('No price updates provided');
    }

    console.log(`Updating ${updates.length} prices for user ${user.id}`);

    const results = [];

    for (const update of updates) {
      try {
        // Get product details
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', update.product_id)
          .eq('user_id', user.id)
          .single();

        if (productError || !product) {
          results.push({
            product_id: update.product_id,
            success: false,
            error: 'Product not found',
          });
          continue;
        }

        if (!product.takealot_offer_id) {
          results.push({
            product_id: update.product_id,
            success: false,
            error: 'No Takealot offer ID',
          });
          continue;
        }

        // Update price on Takealot - Official endpoint
        const takealotResponse = await fetch(
          `https://seller-api.takealot.com/v2/offers/offer/${product.takealot_offer_id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Key ${takealotApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              selling_price: update.new_price,
            }),
          }
        );

        if (!takealotResponse.ok) {
          const errorText = await takealotResponse.text();
          console.error(`Takealot API error for product ${product.id}:`, errorText);
          results.push({
            product_id: update.product_id,
            success: false,
            error: `Takealot API error: ${takealotResponse.status}`,
          });
          continue;
        }

        // Log price change
        await supabase.from('price_history').insert({
          product_id: product.id,
          old_price: product.current_price,
          new_price: update.new_price,
          reason: 'Repricing rule applied',
        });

        // Update local database
        await supabase
          .from('products')
          .update({
            current_price: update.new_price,
            last_repriced_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        results.push({
          product_id: update.product_id,
          success: true,
          old_price: product.current_price,
          new_price: update.new_price,
        });

        console.log(`Updated price for product ${product.id}: ${product.current_price} -> ${update.new_price}`);
      } catch (error) {
        console.error(`Error updating product ${update.product_id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          product_id: update.product_id,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Price update complete: ${successCount}/${updates.length} succeeded`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total: updates.length,
        succeeded: successCount,
        failed: updates.length - successCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
