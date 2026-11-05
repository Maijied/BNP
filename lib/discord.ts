import { OrderRecord } from "@/lib/types";

/**
 * Dispatches a rich embed order notification to the private Discord webhook.
 * Executes server-side only; DISCORD_WEBHOOK_URL is never included in client bundles.
 */
export async function sendOrderDiscordNotification(order: OrderRecord): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.includes("your_webhook_id")) {
    console.log(`[Discord Dev Mock] Notification triggered for Order ${order.order_number}: ৳${order.total} BDT (${order.payment_status})`);
    return true;
  }

  const modelName = order.model === "A" ? "Model A (Motorcycle 285×50mm)" : "Model B (Scooter 200×100mm)";
  const bracketText = order.bracket ? "✅ Yes (+80 BDT / pc)" : "❌ None";

  const embed = {
    title: `🏍️ New Paid Order: ${order.order_number}`,
    color: 0xe11d2e, // BNP signature red
    description: `A new customer order has been confirmed on **bnp.shop**.`,
    fields: [
      {
        name: "👤 Customer Name",
        value: order.name + (order.shop_name ? ` (${order.shop_name})` : ""),
        inline: true,
      },
      {
        name: "📞 Phone Number",
        value: `\`${order.phone}\``,
        inline: true,
      },
      {
        name: "📍 Delivery District",
        value: order.district,
        inline: true,
      },
      {
        name: "📋 Stamped Plate Number",
        value: `**${order.reg_number_bangla}**`,
        inline: false,
      },
      {
        name: "📐 Vehicle Model",
        value: modelName,
        inline: true,
      },
      {
        name: "🔩 Mounting Kit",
        value: bracketText,
        inline: true,
      },
      {
        name: "📦 Quantity",
        value: `${order.quantity} pcs`,
        inline: true,
      },
      {
        name: "💰 Total Paid",
        value: `**৳ ${order.total} BDT**`,
        inline: true,
      },
      {
        name: "💳 Payment Method",
        value: order.payment_method,
        inline: true,
      },
      {
        name: "🔖 Transaction ID",
        value: `\`${order.lora_trx_id || order.trx_note || "N/A"}\``,
        inline: true,
      },
      {
        name: "🏠 Full Street Address",
        value: order.address,
        inline: false,
      },
      {
        name: "📲 WhatsApp Document Chat",
        value: `[Open WhatsApp with Customer (88${order.phone})](https://wa.me/88${order.phone})`,
        inline: false,
      },
    ],
    footer: {
      text: "BNP | A Joy & Arash Enterprise Venture",
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "BNP Order Dispatcher",
        embeds: [embed],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Discord webhook responded with error (${res.status}):`, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to send Discord webhook:", err);
    return false;
  }
}

