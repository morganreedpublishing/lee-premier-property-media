const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const PACKAGES = {
  "Essential Package": 27500,
  "Essential Package + Aerial Coverage": 40000,
  "Luxury Media Bundle": 65000,
};

const ADDONS = {
  "Virtual staging": 7500,
  "Twilight photos": 12500,
};

const ADDON_QUANTITY_LIMITS = {
  "Virtual staging": 1,
  "Twilight photos": 1,
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return response(500, { error: "Stripe is not configured." });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "Invalid request body." });
  }

  const packageName = payload.packageName;
  const addonItems = Array.isArray(payload.addons)
    ? payload.addons.map((addon) => {
        if (typeof addon === "string") {
          return { name: addon, quantity: 1 };
        }

        return {
          name: addon.name,
          quantity: Number(addon.quantity || 1),
        };
      })
    : [];
  const customer = payload.customer || {};
  const baseUrl = event.headers.origin || process.env.URL || "https://www.leepremierpropertymedia.com";

  if (!PACKAGES[packageName]) {
    return response(400, { error: "Invalid package selected." });
  }

  const invalidAddon = addonItems.find((addon) => !ADDONS[addon.name]);

  if (invalidAddon) {
    return response(400, { error: `Invalid add-on selected: ${invalidAddon.name}` });
  }

  const invalidQuantity = addonItems.find((addon) => {
    const maxQuantity = ADDON_QUANTITY_LIMITS[addon.name] || 1;
    return !Number.isInteger(addon.quantity) || addon.quantity < 1 || addon.quantity > maxQuantity;
  });

  if (invalidQuantity) {
    return response(400, { error: `Invalid quantity selected for ${invalidQuantity.name}.` });
  }

  const lineItems = [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: packageName,
          description: "Lee Premier Property Media photoshoot package",
        },
        unit_amount: PACKAGES[packageName],
      },
      quantity: 1,
    },
    ...addonItems.map((addon) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: addon.name,
          description: "Lee Premier Property Media add-on service",
        },
        unit_amount: ADDONS[addon.name],
      },
      quantity: addon.quantity,
    })),
  ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customer.email || undefined,
      billing_address_collection: "auto",
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        package: packageName,
        addons: addonItems.map((addon) => `${addon.name} x ${addon.quantity}`).join(", ") || "None",
        customer_name: customer.name || "",
        customer_phone: customer.phone || "",
        property_address: customer.address || "",
        preferred_date: customer.date || "",
        preferred_time: customer.time || "",
      },
      success_url: `${baseUrl}/?payment=success#booking`,
      cancel_url: `${baseUrl}/?payment=cancelled#booking`,
    });

    return response(200, { url: session.url });
  } catch (error) {
    return response(500, { error: error.message || "Unable to create checkout session." });
  }
};
